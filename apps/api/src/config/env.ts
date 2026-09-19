import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  RUN_MIGRATIONS_ON_START: z.stringbool().default(true),
  DOCS_USERNAME: z.string().default('admin'),
  DOCS_PASSWORD: z.string().default('change_me_locally'),
  JWT_SECRET: z.string().min(32),
  JWT_ISSUER: z.string(),
  JWT_AUDIENCE: z.string(),
  JWT_ACCESS_TOKEN_EXPIRY_MINUTES: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TOKEN_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  JOLPICA_BASE_URL: z.url().default('https://api.jolpi.ca/ergast/f1'),
  RACE_CALENDAR_CACHE_TTL_HOURS: z.coerce.number().int().positive().default(24),
  GRADING_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
  // Only safe because port 3003 isn't port-forwarded on the router, so the
  // only thing that can ever connect directly is something on the home LAN.
  TRUST_PROXY: z.stringbool().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:\n', z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
