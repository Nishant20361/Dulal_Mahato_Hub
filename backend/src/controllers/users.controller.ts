import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string().email('Invalid email address'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
    revokeOtherSessions: z.boolean().optional().default(true),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = updateProfileSchema.parse(req.body);
    const email = validated.email.toLowerCase().trim();
    const username = validated.username.toLowerCase().trim();

    // Check unique username / email if changed
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        OR: [{ email }, { username }],
      },
    });

    if (conflict) {
      if (conflict.email === email) {
        res.status(400).json({ success: false, error: { message: 'Email is already in use by another account' } });
        return;
      }
      if (conflict.username === username) {
        res.status(400).json({ success: false, error: { message: 'Username is already in use' } });
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: validated.name.trim(),
        username,
        email,
      },
    });

    const { passwordHash: _, ...safeUser } = updated;

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PROFILE_UPDATED',
        entityType: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const validated = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ success: false, error: { message: 'User not found' } });
      return;
    }

    const isCurrentValid = await bcrypt.compare(validated.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      res.status(400).json({ success: false, error: { message: 'Incorrect current password' } });
      return;
    }

    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    if (validated.revokeOtherSessions) {
      // Invalidate all sessions except current session
      await prisma.session.updateMany({
        where: {
          userId,
          id: { not: req.sessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getStorageUsage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const [files, fileCount, folderCount, noteCount] = await Promise.all([
      prisma.file.findMany({
        where: { userId, isTrashed: false },
        select: { size: true },
      }),
      prisma.file.count({ where: { userId, isTrashed: false } }),
      prisma.folder.count({ where: { userId, isTrashed: false } }),
      prisma.note.count({ where: { userId, isTrashed: false } }),
    ]);

    let totalBytes = 0n;
    for (const f of files) {
      totalBytes += f.size;
    }

    res.status(200).json({
      success: true,
      storage: {
        usedBytes: Number(totalBytes),
        formattedUsed: formatBytes(Number(totalBytes)),
        totalFiles: fileCount,
        totalFolders: folderCount,
        totalNotes: noteCount,
        provider: 'local-filesystem',
      },
    });
  } catch (error) {
    next(error);
  }
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
