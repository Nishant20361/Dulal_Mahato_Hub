import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

// If DATABASE_URL or SESSION_SECRET is blank/empty, default to local values
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
  process.env.DATABASE_URL = 'file:./dev.db';
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.trim() === '') {
  process.env.SESSION_SECRET = 'dulal-mahato-hub-secure-session-secret-local-dev';
}

const dbUrlValidator = z
  .string()
  .default('file:./dev.db')
  .transform((val) => (val.trim() === '' ? 'file:./dev.db' : val.trim()))
  .refine(
    (url) =>
      url.startsWith('file:') ||
      url.startsWith('postgresql://') ||
      url.startsWith('postgres://'),
    { message: 'Database URL must be a valid file: (SQLite) or postgresql:// connection string' }
  );

const envSchema = z.object({
  PORT: z.string().default('5001').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  // Database (SQLite in local mode, easily swapped for Supabase PostgreSQL later)
  DATABASE_URL: dbUrlValidator,
  DIRECT_URL: z.string().optional(),

  // Local development settings
  LOCAL_DEV_MODE: z
    .string()
    .default('true')
    .transform((val) => val.toLowerCase() === 'true' || val === '1'),
  SESSION_SECRET: z
    .string()
    .default('dulal-mahato-hub-secure-session-secret-local-dev')
    .transform((val) => (val.trim() === '' ? 'dulal-mahato-hub-secure-session-secret-local-dev' : val.trim())),
  MAX_FILE_SIZE_MB: z.string().default('500').transform((val) => parseInt(val, 10)),
  LOCAL_STORAGE_PATH: z.string().default('./storage'),

  // Future cloud configurations (optional for local operation)
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().optional(),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().optional(),
  BREVO_SENDER_NAME: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().optional(),
  R2_PUBLIC_DOMAIN: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment configuration error:');
  const formattedErrors = parsedEnv.error.format();
  for (const [key, error] of Object.entries(formattedErrors)) {
    if (key !== '_errors') {
      const err = error as { _errors?: string[] };
      console.error(`  - ${key}: ${err._errors?.join(', ')}`);
    }
  }
  process.exit(1);
}

export const env = parsedEnv.data;
export const isDatabaseConfigured = Boolean(env.DATABASE_URL);
