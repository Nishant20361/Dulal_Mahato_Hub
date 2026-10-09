import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function globalSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const query = req.query.q as string | undefined;

    if (!query || query.trim().length === 0) {
      res.status(200).json({
        success: true,
        results: { files: [], folders: [], notes: [] },
        total: 0,
      });
      return;
    }

    const searchTerm = query.trim();

    const [files, folders, notes] = await Promise.all([
      prisma.file.findMany({
        where: {
          userId,
          isTrashed: false,
          name: { contains: searchTerm },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          folder: { select: { id: true, name: true } },
        },
      }),
      prisma.folder.findMany({
        where: {
          userId,
          isTrashed: false,
          name: { contains: searchTerm },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.note.findMany({
        where: {
          userId,
          isTrashed: false,
          OR: [
            { title: { contains: searchTerm } },
            { content: { contains: searchTerm } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ]);

    res.status(200).json({
      success: true,
      query: searchTerm,
      results: {
        files,
        folders,
        notes,
      },
      total: files.length + folders.length + notes.length,
    });
  } catch (error) {
    next(error);
  }
}
