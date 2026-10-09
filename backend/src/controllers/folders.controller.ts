import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name cannot be empty').max(100),
  parentId: z.string().nullable().optional(),
});

const renameFolderSchema = z.object({
  name: z.string().trim().min(1, 'Folder name cannot be empty').max(100),
});

const moveFolderSchema = z.object({
  targetParentId: z.string().nullable(),
});

export async function listFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { parentId, all } = req.query;

    if (all === 'true') {
      const folders = await prisma.folder.findMany({
        where: { userId, isTrashed: false },
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { files: { where: { isTrashed: false } }, children: { where: { isTrashed: false } } },
          },
        },
      });

      res.status(200).json({ success: true, folders });
      return;
    }

    const whereParentId = parentId === undefined || parentId === 'null' || parentId === '' ? null : String(parentId);

    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId: whereParentId,
        isTrashed: false,
      },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { files: { where: { isTrashed: false } }, children: { where: { isTrashed: false } } },
        },
      },
    });

    res.status(200).json({ success: true, folders });
  } catch (error) {
    next(error);
  }
}

export async function createFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = createFolderSchema.parse(req.body);
    const parentId = validated.parentId || null;

    if (parentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: parentId, userId, isTrashed: false },
      });
      if (!parent) {
        res.status(404).json({
          success: false,
          error: { message: 'Parent folder not found', code: 'PARENT_NOT_FOUND' },
        });
        return;
      }
    }

    // Check duplicate name in same folder
    const existing = await prisma.folder.findFirst({
      where: {
        userId,
        parentId,
        name: validated.name,
        isTrashed: false,
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: { message: 'A folder with this name already exists in this location', code: 'FOLDER_EXISTS' },
      });
      return;
    }

    const folder = await prisma.folder.create({
      data: {
        userId,
        parentId,
        name: validated.name,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FOLDER_CREATED',
        entityType: 'Folder',
        entityId: folder.id,
        metadata: JSON.stringify({ name: folder.name, parentId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(201).json({ success: true, folder });
  } catch (error) {
    next(error);
  }
}

export async function getFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const folderId = req.params.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: false },
    });

    if (!folder) {
      res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'FOLDER_NOT_FOUND' },
      });
      return;
    }

    // Build breadcrumbs path by traversing up parentId chain
    const breadcrumbs: Array<{ id: string | null; name: string }> = [
      { id: null, name: 'My Drive' },
    ];

    const chain: Array<{ id: string; name: string }> = [];
    let currentParentId = folder.parentId;

    while (currentParentId) {
      const parent = await prisma.folder.findFirst({
        where: { id: currentParentId, userId },
        select: { id: true, name: true, parentId: true },
      });
      if (!parent) break;
      chain.unshift({ id: parent.id, name: parent.name });
      currentParentId = parent.parentId;
    }

    breadcrumbs.push(...chain);
    breadcrumbs.push({ id: folder.id, name: folder.name });

    res.status(200).json({
      success: true,
      folder,
      breadcrumbs,
    });
  } catch (error) {
    next(error);
  }
}

export async function renameFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const folderId = req.params.id;
    const validated = renameFolderSchema.parse(req.body);

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: false },
    });

    if (!folder) {
      res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'FOLDER_NOT_FOUND' },
      });
      return;
    }

    // Check duplicate name in same parent
    const existing = await prisma.folder.findFirst({
      where: {
        userId,
        parentId: folder.parentId,
        name: validated.name,
        id: { not: folderId },
        isTrashed: false,
      },
    });

    if (existing) {
      res.status(400).json({
        success: false,
        error: { message: 'A folder with this name already exists in this location', code: 'FOLDER_EXISTS' },
      });
      return;
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { name: validated.name },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FOLDER_RENAMED',
        entityType: 'Folder',
        entityId: folderId,
        metadata: JSON.stringify({ oldName: folder.name, newName: validated.name }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, folder: updated });
  } catch (error) {
    next(error);
  }
}

export async function moveFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const folderId = req.params.id;
    const { targetParentId } = moveFolderSchema.parse(req.body);

    if (folderId === targetParentId) {
      res.status(400).json({
        success: false,
        error: { message: 'Cannot move folder into itself', code: 'INVALID_MOVE' },
      });
      return;
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: false },
    });

    if (!folder) {
      res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'FOLDER_NOT_FOUND' },
      });
      return;
    }

    if (targetParentId) {
      const target = await prisma.folder.findFirst({
        where: { id: targetParentId, userId, isTrashed: false },
      });
      if (!target) {
        res.status(404).json({
          success: false,
          error: { message: 'Target destination folder not found', code: 'TARGET_NOT_FOUND' },
        });
        return;
      }

      // Check circular reference: targetParentId cannot be a descendant of folderId
      let currentCheck: string | null = targetParentId;
      while (currentCheck) {
        if (currentCheck === folderId) {
          res.status(400).json({
            success: false,
            error: { message: 'Cannot move folder into one of its subfolders', code: 'CIRCULAR_MOVE' },
          });
          return;
        }
        const parentRecord: { parentId: string | null } | null = await prisma.folder.findUnique({
          where: { id: currentCheck },
          select: { parentId: true },
        });
        currentCheck = parentRecord ? parentRecord.parentId : null;
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { parentId: targetParentId },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FOLDER_MOVED',
        entityType: 'Folder',
        entityId: folderId,
        metadata: JSON.stringify({ from: folder.parentId, to: targetParentId }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, folder: updated });
  } catch (error) {
    next(error);
  }
}

export async function trashFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const folderId = req.params.id;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: false },
    });

    if (!folder) {
      res.status(404).json({
        success: false,
        error: { message: 'Folder not found', code: 'FOLDER_NOT_FOUND' },
      });
      return;
    }

    const trashedAt = new Date();

    // Collect all descendant folder IDs recursively
    const folderIdsToTrash = [folderId];
    const queue = [folderId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = await prisma.folder.findMany({
        where: { parentId: current, userId, isTrashed: false },
        select: { id: true },
      });
      for (const child of children) {
        folderIdsToTrash.push(child.id);
        queue.push(child.id);
      }
    }

    // Soft delete folders and contained files in a transaction
    await prisma.$transaction([
      prisma.folder.updateMany({
        where: { id: { in: folderIdsToTrash }, userId },
        data: { isTrashed: true, trashedAt },
      }),
      prisma.file.updateMany({
        where: { folderId: { in: folderIdsToTrash }, userId },
        data: { isTrashed: true, trashedAt },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'FOLDER_TRASHED',
        entityType: 'Folder',
        entityId: folderId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, message: 'Folder moved to trash' });
  } catch (error) {
    next(error);
  }
}
