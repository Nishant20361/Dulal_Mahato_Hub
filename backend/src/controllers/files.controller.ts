import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { storageService } from '../services/storage/local-storage.service';
import { env } from '../config/env';
import { hashToken } from '../middleware/auth';

// Configure Multer with temporary directory
export const upload = multer({
  dest: path.join(os.tmpdir(), 'dmh-uploads'),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

const renameFileSchema = z.object({
  name: z.string().trim().min(1, 'File name cannot be empty').max(255),
});

const moveFileSchema = z.object({
  targetFolderId: z.string().nullable(),
});

function sanitizeFilename(name: string): string {
  // Prevent path traversal and illegal characters
  return name.replace(/[/\\?%*:|"<>]/g, '_').trim();
}

/**
 * Resolves a unique filename for keep_both strategy: "name (1).ext"
 */
async function getUniqueFilename(userId: string, folderId: string | null, originalName: string): Promise<string> {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);

  let candidate = originalName;
  let counter = 1;

  while (true) {
    const existing = await prisma.file.findFirst({
      where: { userId, folderId, name: candidate, isTrashed: false },
    });
    if (!existing) {
      return candidate;
    }
    candidate = `${base} (${counter})${ext}`;
    counter++;
  }
}

/**
 * In-flight lock map to serialize concurrent folder hierarchy creation
 * Prevents race condition duplicates when multiple files upload in parallel
 */
const pendingFolderCreations = new Map<string, Promise<string>>();

/**
 * Creates intermediate nested folders if a relative path was uploaded
 */
async function resolveFolderHierarchy(
  userId: string,
  rootFolderId: string | null,
  relativePath: string
): Promise<string | null> {
  const segments = relativePath
    .split('/')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Remove the file itself from the segments list
  segments.pop();

  if (segments.length === 0) {
    return rootFolderId;
  }

  let currentParentId = rootFolderId;

  for (const folderName of segments) {
    const safeName = sanitizeFilename(folderName);
    const lockKey = `${userId}:${currentParentId || 'root'}:${safeName.toLowerCase()}`;

    // If another concurrent upload is already resolving/creating this exact folder, wait for it
    if (pendingFolderCreations.has(lockKey)) {
      currentParentId = await pendingFolderCreations.get(lockKey)!;
      continue;
    }

    const resolutionPromise = (async () => {
      let folder: { id: string } | null = await prisma.folder.findFirst({
        where: {
          userId,
          parentId: currentParentId,
          name: safeName,
          isTrashed: false,
        },
      });

      if (!folder) {
        folder = await prisma.folder.create({
          data: {
            userId,
            parentId: currentParentId,
            name: safeName,
          },
        });
      }

      return folder.id;
    })();

    pendingFolderCreations.set(lockKey, resolutionPromise);
    try {
      currentParentId = await resolutionPromise;
    } finally {
      pendingFolderCreations.delete(lockKey);
    }
  }

  return currentParentId;
}

export async function listFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { folderId } = req.query;

    const whereFolderId =
      folderId === undefined || folderId === 'null' || folderId === '' ? null : String(folderId);

    const files = await prisma.file.findMany({
      where: {
        userId,
        folderId: whereFolderId,
        isTrashed: false,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(200).json({ success: true, files });
  } catch (error) {
    next(error);
  }
}

export async function uploadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const uploadedFiles = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file;

    const allUploaded = uploadedFiles || (singleFile ? [singleFile] : []);

    if (allUploaded.length === 0) {
      res.status(400).json({
        success: false,
        error: { message: 'No file uploaded', code: 'NO_FILE' },
      });
      return;
    }

    const targetFolderId = req.body.folderId && req.body.folderId !== 'null' ? req.body.folderId : null;
    const conflictAction = (req.body.conflictAction as string) || 'keep_both'; // 'replace' | 'keep_both'

    const createdFiles = [];

    for (const rawFile of allUploaded) {
      // Decode filename safely
      const originalName = Buffer.from(rawFile.originalname, 'latin1').toString('utf8');
      const safeDisplayName = sanitizeFilename(originalName);
      const ext = path.extname(safeDisplayName).toLowerCase().replace('.', '');
      const mimeType = rawFile.mimetype || 'application/octet-stream';

      // Check if relativePath was sent (from folder upload)
      const relativePath = req.body.relativePath || originalName;
      const effectiveFolderId = await resolveFolderHierarchy(userId, targetFolderId, relativePath);

      // Check for conflict
      const existingFile = await prisma.file.findFirst({
        where: {
          userId,
          folderId: effectiveFolderId,
          name: safeDisplayName,
          isTrashed: false,
        },
      });

      let finalFilename = safeDisplayName;
      let targetFileId = crypto.randomUUID();

      if (existingFile) {
        if (conflictAction === 'replace') {
          // Replace existing file physical bytes and update metadata
          await storageService.deleteFile(userId, existingFile.id);
          const saveResult = await storageService.saveFile(userId, existingFile.id, rawFile.path);

          const updatedFile = await prisma.file.update({
            where: { id: existingFile.id },
            data: {
              size: BigInt(saveResult.size),
              checksum: saveResult.checksum,
              mimeType,
              extension: ext,
              updatedAt: new Date(),
            },
          });

          createdFiles.push(updatedFile);
          continue;
        } else {
          // Default: keep both, pick unique name "file (1).pdf"
          finalFilename = await getUniqueFilename(userId, effectiveFolderId, safeDisplayName);
        }
      }

      // Save to physical storage
      const saveResult = await storageService.saveFile(userId, targetFileId, rawFile.path);

      // Create database record
      const fileRecord = await prisma.file.create({
        data: {
          id: targetFileId,
          userId,
          folderId: effectiveFolderId,
          name: finalFilename,
          originalName,
          storageKey: saveResult.storageKey,
          mimeType,
          extension: ext,
          size: BigInt(saveResult.size),
          checksum: saveResult.checksum,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'FILE_UPLOADED',
          entityType: 'File',
          entityId: fileRecord.id,
          metadata: JSON.stringify({ name: fileRecord.name, size: saveResult.size }),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      createdFiles.push(fileRecord);
    }

    res.status(201).json({
      success: true,
      message: `${createdFiles.length} file(s) uploaded successfully`,
      files: createdFiles,
    });
  } catch (error) {
    next(error);
  }
}

export async function getFileContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fileId = req.params.id;
    let userId = req.user?.id;

    // Allow token query param for inline media rendering (video, audio, iframe)
    if (!userId && req.query.token) {
      const tokenHash = hashToken(String(req.query.token));
      const session = await prisma.session.findUnique({
        where: { tokenHash },
        select: { userId: true, expiresAt: true, revokedAt: true },
      });
      if (session && !session.revokedAt && session.expiresAt > new Date()) {
        userId = session.userId;
      }
    }

    if (!userId) {
      res.status(401).json({ success: false, error: { message: 'Authentication required' } });
      return;
    }

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    // Touch lastOpenedAt asynchronously
    prisma.file.update({
      where: { id: file.id },
      data: { lastOpenedAt: new Date() },
    }).catch(() => {});

    const streamResult = await storageService.getFileStream(userId, file.id, req.headers.range);

    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors 'self' http://localhost:5173 http://127.0.0.1:5173 *");
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', streamResult.contentLength);

    if (streamResult.isPartial && streamResult.contentRange) {
      res.status(206);
      res.setHeader('Content-Range', streamResult.contentRange);
    } else {
      res.status(200);
    }

    streamResult.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId },
    });

    if (!file) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    const streamResult = await storageService.getFileStream(userId, file.id);

    const safeFilename = encodeURIComponent(file.name);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', streamResult.contentLength);

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FILE_DOWNLOADED',
        entityType: 'File',
        entityId: file.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    streamResult.stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function renameFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;
    const { name } = renameFileSchema.parse(req.body);

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId, isTrashed: false },
    });

    if (!file) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    const safeName = sanitizeFilename(name);
    const updated = await prisma.file.update({
      where: { id: fileId },
      data: {
        name: safeName,
        extension: path.extname(safeName).toLowerCase().replace('.', ''),
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FILE_RENAMED',
        entityType: 'File',
        entityId: fileId,
        metadata: JSON.stringify({ oldName: file.name, newName: safeName }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, file: updated });
  } catch (error) {
    next(error);
  }
}

export async function moveFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;
    const { targetFolderId } = moveFileSchema.parse(req.body);

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId, isTrashed: false },
    });

    if (!file) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    if (targetFolderId) {
      const folder = await prisma.folder.findFirst({
        where: { id: targetFolderId, userId, isTrashed: false },
      });
      if (!folder) {
        res.status(404).json({ success: false, error: { message: 'Target folder not found' } });
        return;
      }
    }

    const updated = await prisma.file.update({
      where: { id: fileId },
      data: { folderId: targetFolderId },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FILE_MOVED',
        entityType: 'File',
        entityId: fileId,
        metadata: JSON.stringify({ from: file.folderId, to: targetFolderId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, file: updated });
  } catch (error) {
    next(error);
  }
}

export async function trashFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const fileId = req.params.id;

    const file = await prisma.file.findFirst({
      where: { id: fileId, userId, isTrashed: false },
    });

    if (!file) {
      res.status(404).json({ success: false, error: { message: 'File not found' } });
      return;
    }

    await prisma.file.update({
      where: { id: fileId },
      data: { isTrashed: true, trashedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FILE_TRASHED',
        entityType: 'File',
        entityId: fileId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, message: 'File moved to trash' });
  } catch (error) {
    next(error);
  }
}
