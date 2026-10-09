import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export async function getRecentActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    // Fetch top 30 recent files
    const files = await prisma.file.findMany({
      where: { userId, isTrashed: false },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        folder: { select: { id: true, name: true } },
      },
    });

    // Fetch top 20 recent notes
    const notes = await prisma.note.findMany({
      where: { userId, isTrashed: false },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    res.status(200).json({
      success: true,
      recent: {
        files,
        notes,
      },
    });
  } catch (error) {
    next(error);
  }
}
