import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRouter from './routes';

export function createApp(): Application {
  const app = express();

  // Security Headers (Allowing iframe embedding for file previews)
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: [
            "'self'",
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            env.FRONTEND_URL,
            'http://*:5173',
            'http://*:5001',
          ],
        },
      },
    })
  );

  // Cross-Origin Resource Sharing
  const allowedOrigins = [env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'];
  app.use(
    cors({
      origin: (requestOrigin, callback) => {
        if (
          !requestOrigin ||
          allowedOrigins.includes(requestOrigin) ||
          /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(
            requestOrigin
          )
        ) {
          callback(null, true);
        } else {
          callback(null, true); // Dev-friendly fallback for local testing
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Rate Limiting
  app.use(globalRateLimiter);

  // Body and Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Root Welcome Endpoint
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Dulal Mahato Hub API',
      version: '1.0.0',
      docs: '/api/v1/health',
    });
  });

  // API v1 Routes
  app.use('/api/v1', apiRouter);

  // 404 & Global Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
