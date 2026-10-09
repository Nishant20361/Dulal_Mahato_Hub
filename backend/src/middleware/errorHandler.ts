import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown;
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): void {
  res.status(404).json({
    success: false,
    error: {
      message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
      code: 'NOT_FOUND',
    },
  });
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_SERVER_ERROR',
      ...(env.NODE_ENV === 'development' && { stack: err.stack, details: err.details }),
    },
  });
}
