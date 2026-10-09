import { PrismaClient } from '@prisma/client';
import { env, isDatabaseConfigured } from '../config/env';

// Enable BigInt serialization to string for JSON responses
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface DatabaseHealthStatus {
  status: 'connected' | 'disconnected' | 'not_configured';
  configured: boolean;
  provider: 'sqlite' | 'postgresql';
  latencyMs?: number;
  message?: string;
}

/**
 * Diagnostic helper to safely verify database connectivity
 */
export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  if (!isDatabaseConfigured) {
    return {
      status: 'not_configured',
      configured: false,
      provider: 'sqlite',
      message: 'DATABASE_URL is not configured in backend/.env',
    };
  }

  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Date.now() - startTime;

    return {
      status: 'connected',
      configured: true,
      provider: 'sqlite',
      latencyMs,
      message: 'Successfully connected to local SQLite database',
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database connection error';

    const sanitizedMessage = errorMessage
      .replace(/:[^:@]+@/, ':***@')
      .split('\n')[0];

    return {
      status: 'disconnected',
      configured: true,
      provider: 'sqlite',
      latencyMs,
      message: sanitizedMessage,
    };
  }
}

// Cleanup on process termination
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
