import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  generateSessionToken,
  hashToken,
  SESSION_COOKIE_NAME,
  SafeUser,
} from '../middleware/auth';
import { emailService } from '../services/email/development-email.service';
import { env } from '../config/env';

// Validation Schemas
const signupSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username cannot exceed 30 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

function getCookieOptions(rememberMe: boolean = false) {
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 7 * 24 * 60 * 60 * 1000; // 7 days

  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: (env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    maxAge,
    path: '/',
  };
}

export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = signupSchema.parse(req.body);
    const email = validated.email.toLowerCase().trim();
    const username = validated.username.toLowerCase().trim();

    // Enforce strict uniqueness: one user per username, one user per email
    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUsers.length > 0) {
      const usernameExists = existingUsers.some((u) => u.username.toLowerCase() === username);
      if (usernameExists) {
        res.status(400).json({
          success: false,
          error: {
            message: `The username "${username}" is already taken. Please choose another username.`,
            code: 'USERNAME_EXISTS',
          },
        });
        return;
      }

      const emailExists = existingUsers.some((u) => u.email.toLowerCase() === email);
      if (emailExists) {
        res.status(400).json({
          success: false,
          error: {
            message: 'An account with this email address already exists. Please sign in instead.',
            code: 'EMAIL_EXISTS',
          },
        });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        name: validated.name.trim(),
        username,
        email,
        passwordHash,
      },
    });

    // Auto-create session on signup
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Log Activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'SIGNUP',
        entityType: 'User',
        entityId: user.id,
        metadata: JSON.stringify({ email: user.email, username: user.username }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(false));

    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: safeUser,
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      const target = String(error.meta?.target || '');
      if (target.includes('username')) {
        res.status(400).json({
          success: false,
          error: {
            message: 'This username is already taken. Please choose another username.',
            code: 'USERNAME_EXISTS',
          },
        });
        return;
      }
      if (target.includes('email')) {
        res.status(400).json({
          success: false,
          error: {
            message: 'An account with this email address already exists. Please sign in instead.',
            code: 'EMAIL_EXISTS',
          },
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: {
          message: 'Username or email already in use. Please choose another.',
          code: 'UNIQUE_CONSTRAINT_FAILED',
        },
      });
      return;
    }
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = loginSchema.parse(req.body);
    const identifier = validated.identifier.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid username/email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: { message: 'Invalid username/email or password', code: 'INVALID_CREDENTIALS' },
      });
      return;
    }

    // Create session
    const token = generateSessionToken();
    const tokenHash = hashToken(token);
    const durationMs = validated.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + durationMs);

    await prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(validated.rememberMe));

    const { passwordHash: _, ...safeUser } = user;
    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      user: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (req.sessionId) {
      await prisma.session.update({
        where: { id: req.sessionId },
        data: { revokedAt: new Date() },
      }).catch(() => {});
    }

    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: req.user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      }).catch(() => {});
    }

    res.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      path: '/',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response): Promise<void> {
  res.status(200).json({
    success: true,
    user: req.user,
  });
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = forgotPasswordSchema.parse(req.body);
    const email = validated.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Generic safe response message to not leak account existence
    const genericResponse: { success: boolean; message: string; devOtp?: string } = {
      success: true,
      message: 'If an account exists for this email, a verification code has been sent.',
    };

    if (!user) {
      res.status(200).json(genericResponse);
      return;
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Invalidate existing unused OTPs
    await prisma.passwordResetOtp.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetOtp.create({
      data: {
        userId: user.id,
        otpHash,
        expiresAt,
      },
    });

    // Send through EmailService
    await emailService.sendPasswordResetOtp(email, otp);

    // In Local Dev Mode only: include devOtp for easy local testing
    if (env.LOCAL_DEV_MODE) {
      genericResponse.devOtp = otp;
    }

    res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
}

export async function verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = verifyOtpSchema.parse(req.body);
    const email = validated.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired verification code', code: 'INVALID_OTP' },
      });
      return;
    }

    const otpHash = hashToken(validated.otp);

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otpHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      // Increment attempt counter if a record exists
      await prisma.passwordResetOtp.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { attempts: { increment: 1 } },
      });

      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired verification code', code: 'INVALID_OTP' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Verification code confirmed successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = resetPasswordSchema.parse(req.body);
    const email = validated.email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid request or expired OTP', code: 'INVALID_REQUEST' },
      });
      return;
    }

    const otpHash = hashToken(validated.otp);

    const otpRecord = await prisma.passwordResetOtp.findFirst({
      where: {
        userId: user.id,
        otpHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otpRecord) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid or expired verification code', code: 'INVALID_OTP' },
      });
      return;
    }

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Hash new password
    const newPasswordHash = await bcrypt.hash(validated.newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate all active sessions for this user for security
    await prisma.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Activity Log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    });

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

export async function checkUsernameAvailability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const raw = String(req.query.username || '').trim().toLowerCase();
    if (!raw || raw.length < 3) {
      res.json({
        success: true,
        available: false,
        message: 'Username must be at least 3 characters',
      });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { username: raw },
    });

    if (existing) {
      res.json({
        success: true,
        available: false,
        message: 'Username is already taken',
      });
      return;
    }

    res.json({
      success: true,
      available: true,
      message: 'Username is available',
    });
  } catch (error) {
    next(error);
  }
}

