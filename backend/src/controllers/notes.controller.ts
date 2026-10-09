import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const createNoteSchema = z.object({
  title: z.string().trim().default('Untitled Note'),
  content: z.string().default(''),
  isPinned: z.boolean().optional().default(false),
});

const updateNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').optional(),
  content: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export async function listNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { search } = req.query;

    const whereClause: any = {
      userId,
      isTrashed: false,
    };

    if (search && typeof search === 'string') {
      whereClause.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
    });

    res.status(200).json({ success: true, notes });
  } catch (error) {
    next(error);
  }
}

export async function createNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = createNoteSchema.parse(req.body);

    const note = await prisma.note.create({
      data: {
        userId,
        title: validated.title || 'Untitled Note',
        content: validated.content,
        isPinned: validated.isPinned,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'NOTE_CREATED',
        entityType: 'Note',
        entityId: note.id,
        metadata: JSON.stringify({ title: note.title }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function getNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId, isTrashed: false },
    });

    if (!note) {
      res.status(404).json({ success: false, error: { message: 'Note not found' } });
      return;
    }

    res.status(200).json({ success: true, note });
  } catch (error) {
    next(error);
  }
}

export async function updateNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;
    const validated = updateNoteSchema.parse(req.body);

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId, isTrashed: false },
    });

    if (!note) {
      res.status(404).json({ success: false, error: { message: 'Note not found' } });
      return;
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(validated.title !== undefined && { title: validated.title }),
        ...(validated.content !== undefined && { content: validated.content }),
        ...(validated.isPinned !== undefined && { isPinned: validated.isPinned }),
      },
    });

    res.status(200).json({ success: true, note: updated });
  } catch (error) {
    next(error);
  }
}

export async function togglePinNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId, isTrashed: false },
    });

    if (!note) {
      res.status(404).json({ success: false, error: { message: 'Note not found' } });
      return;
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { isPinned: !note.isPinned },
    });

    res.status(200).json({ success: true, note: updated });
  } catch (error) {
    next(error);
  }
}

export async function trashNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const noteId = req.params.id;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId, isTrashed: false },
    });

    if (!note) {
      res.status(404).json({ success: false, error: { message: 'Note not found' } });
      return;
    }

    await prisma.note.update({
      where: { id: noteId },
      data: { isTrashed: true, trashedAt: new Date() },
    });

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'NOTE_TRASHED',
        entityType: 'Note',
        entityId: noteId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({ success: true, message: 'Note moved to trash' });
  } catch (error) {
    next(error);
  }
}
