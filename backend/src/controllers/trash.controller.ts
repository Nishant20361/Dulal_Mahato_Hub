import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { storageService } from '../services/storage/local-storage.service';

export async function listTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const [folders, files, notes] = await Promise.all([
      prisma.folder.findMany({
        where: { userId, isTrashed: true },
        orderBy: { trashedAt: 'desc' },
      }),
      prisma.file.findMany({
        where: { userId, isTrashed: true },
        orderBy: { trashedAt: 'desc' },
      }),
      prisma.note.findMany({
        where: { userId, isTrashed: true },
        orderBy: { trashedAt: 'desc' },
      }),
    ]);

    res.status(200).json({
      success: true,
      trash: {
        folders,
        files,
        notes,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function restoreItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type, id } = req.body; // type: 'file' | 'folder' | 'note'

    if (type === 'file') {
      const file = await prisma.file.findFirst({
        where: { id, userId, isTrashed: true },
      });
      if (!file) {
        res.status(404).json({ success: false, error: { message: 'File not found in trash' } });
        return;
      }

      // If parent folder is trashed or missing, restore to root drive
      let targetFolderId = file.folderId;
      if (targetFolderId) {
        const parentFolder = await prisma.folder.findFirst({
          where: { id: targetFolderId, userId, isTrashed: false },
        });
        if (!parentFolder) {
          targetFolderId = null;
        }
      }

      await prisma.file.update({
        where: { id },
        data: { isTrashed: false, trashedAt: null, folderId: targetFolderId },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'FILE_RESTORED',
          entityType: 'File',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'File restored successfully' });
      return;
    }

    if (type === 'folder') {
      const folder = await prisma.folder.findFirst({
        where: { id, userId, isTrashed: true },
      });
      if (!folder) {
        res.status(404).json({ success: false, error: { message: 'Folder not found in trash' } });
        return;
      }

      // If parent folder is trashed, restore to root
      let targetParentId = folder.parentId;
      if (targetParentId) {
        const parent = await prisma.folder.findFirst({
          where: { id: targetParentId, userId, isTrashed: false },
        });
        if (!parent) {
          targetParentId = null;
        }
      }

      // Recursively restore all descendants
      const folderIdsToRestore = [id];
      const queue = [id];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = await prisma.folder.findMany({
          where: { parentId: current, userId, isTrashed: true },
          select: { id: true },
        });
        for (const child of children) {
          folderIdsToRestore.push(child.id);
          queue.push(child.id);
        }
      }

      await prisma.$transaction([
        prisma.folder.update({
          where: { id },
          data: { isTrashed: false, trashedAt: null, parentId: targetParentId },
        }),
        prisma.folder.updateMany({
          where: { id: { in: folderIdsToRestore.filter((fId) => fId !== id) }, userId },
          data: { isTrashed: false, trashedAt: null },
        }),
        prisma.file.updateMany({
          where: { folderId: { in: folderIdsToRestore }, userId },
          data: { isTrashed: false, trashedAt: null },
        }),
      ]);

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'FOLDER_RESTORED',
          entityType: 'Folder',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'Folder restored successfully' });
      return;
    }

    if (type === 'note') {
      const note = await prisma.note.findFirst({
        where: { id, userId, isTrashed: true },
      });
      if (!note) {
        res.status(404).json({ success: false, error: { message: 'Note not found in trash' } });
        return;
      }

      await prisma.note.update({
        where: { id },
        data: { isTrashed: false, trashedAt: null },
      });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'NOTE_RESTORED',
          entityType: 'Note',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'Note restored successfully' });
      return;
    }

    res.status(400).json({ success: false, error: { message: 'Invalid item type for restore' } });
  } catch (error) {
    next(error);
  }
}

export async function deletePermanently(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { type, id } = req.params; // /api/v1/trash/:type/:id

    if (type === 'file') {
      const file = await prisma.file.findFirst({
        where: { id, userId },
      });
      if (!file) {
        res.status(404).json({ success: false, error: { message: 'File not found' } });
        return;
      }

      // Delete physical file on disk!
      await storageService.deleteFile(userId, file.id);

      // Delete DB record
      await prisma.file.delete({ where: { id } });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'FILE_DELETED',
          entityType: 'File',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'File permanently deleted' });
      return;
    }

    if (type === 'folder') {
      const folder = await prisma.folder.findFirst({
        where: { id, userId },
      });
      if (!folder) {
        res.status(404).json({ success: false, error: { message: 'Folder not found' } });
        return;
      }

      // Collect all descendant folder IDs
      const folderIds = [id];
      const queue = [id];

      while (queue.length > 0) {
        const current = queue.shift()!;
        const children = await prisma.folder.findMany({
          where: { parentId: current, userId },
          select: { id: true },
        });
        for (const child of children) {
          folderIds.push(child.id);
          queue.push(child.id);
        }
      }

      // Find all files inside these folders
      const filesToDelete = await prisma.file.findMany({
        where: { folderId: { in: folderIds }, userId },
        select: { id: true },
      });

      // Delete physical files
      for (const f of filesToDelete) {
        await storageService.deleteFile(userId, f.id).catch(() => {});
      }

      // Delete DB records
      await prisma.$transaction([
        prisma.file.deleteMany({ where: { folderId: { in: folderIds }, userId } }),
        prisma.folder.deleteMany({ where: { id: { in: folderIds }, userId } }),
      ]);

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'FOLDER_DELETED',
          entityType: 'Folder',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'Folder and contents permanently deleted' });
      return;
    }

    if (type === 'note') {
      const note = await prisma.note.findFirst({
        where: { id, userId },
      });
      if (!note) {
        res.status(404).json({ success: false, error: { message: 'Note not found' } });
        return;
      }

      await prisma.note.delete({ where: { id } });

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'NOTE_DELETED',
          entityType: 'Note',
          entityId: id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.status(200).json({ success: true, message: 'Note permanently deleted' });
      return;
    }

    res.status(400).json({ success: false, error: { message: 'Invalid item type' } });
  } catch (error) {
    next(error);
  }
}

export async function emptyTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    // Find all trashed files
    const trashedFiles = await prisma.file.findMany({
      where: { userId, isTrashed: true },
      select: { id: true },
    });

    // Remove physical files
    for (const file of trashedFiles) {
      await storageService.deleteFile(userId, file.id).catch(() => {});
    }

    // Delete database records
    await prisma.$transaction([
      prisma.file.deleteMany({ where: { userId, isTrashed: true } }),
      prisma.folder.deleteMany({ where: { userId, isTrashed: true } }),
      prisma.note.deleteMany({ where: { userId, isTrashed: true } }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'TRASH_EMPTIED',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, message: 'Trash emptied successfully' });
  } catch (error) {
    next(error);
  }
}
