import { Request, Response } from 'express';
import { env } from '../config/env';
import { checkDatabaseConnection } from '../lib/prisma';
import { storageService } from '../services/storage/local-storage.service';

const startTime = Date.now();

export async function getHealthStatus(_req: Request, res: Response): Promise<void> {
  const uptimeSeconds = Math.floor(process.uptime());
  const uptimeHours = (uptimeSeconds / 3600).toFixed(2);

  const [databaseHealth, storageHealth] = await Promise.all([
    checkDatabaseConnection(),
    storageService.getHealth(),
  ]);

  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'dulal-mahato-hub-api',
    app: 'Dulal Mahato Hub',
    version: '1.0.0',
    environment: env.NODE_ENV,
    localDevMode: env.LOCAL_DEV_MODE,
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: uptimeSeconds,
      formatted: `${uptimeHours} hours`,
      startedAt: new Date(startTime).toISOString(),
    },
    database: databaseHealth,
    storage: storageHealth,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsageMB: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
      },
    },
  });
}
