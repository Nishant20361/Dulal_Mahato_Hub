import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { User } from '@prisma/client';

export type SafeUser = Omit<User, 'passwordHash'>;

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionId?: string;
    }
  }
}

export const SESSION_COOKIE_NAME = 'dmh_session';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.[SESSION_COOKIE_NAME];

    // Fallback to Bearer token in Authorization header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please log in.',
          code: 'UNAUTHORIZED',
        },
      });
      return;
    }

    const tokenHash = hashToken(token);

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Session has expired or is invalid. Please log in again.',
          code: 'SESSION_EXPIRED',
        },
      });
      return;
    }

    // Touch session lastUsedAt asynchronously (non-blocking)
    prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    // Strip password hash from request user
    const { passwordHash, ...safeUser } = session.user;

    req.user = safeUser;
    req.sessionId = session.id;

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.[SESSION_COOKIE_NAME];
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }

    if (!token) {
      return next();
    }

    const tokenHash = hashToken(token);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session && !session.revokedAt && session.expiresAt > new Date()) {
      const { passwordHash, ...safeUser } = session.user;
      req.user = safeUser;
      req.sessionId = session.id;
    }

    next();
  } catch {
    next();
  }
}
