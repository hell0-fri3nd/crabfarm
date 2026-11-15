import 'server-only';

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

import { z } from 'zod';

const ROOT_ENV_FILE = path.resolve(process.cwd(), '..', '.env');

const sameSiteSchema = z.enum(['lax', 'strict', 'none']);

const envSchema = z
  .object({
    API_URL: z.url().transform((url) => url.replace(/\/+$/, '')),
    API_PREFIX: z.string().startsWith('/').default('/api/v1'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    COOKIE_SECURE: z.stringbool().optional(),
    COOKIE_PATH: z.string().startsWith('/').default('/'),
    ACCESS_COOKIE_SAMESITE: sameSiteSchema.default('lax'),
    REFRESH_COOKIE_SAMESITE: sameSiteSchema.default('strict'),
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().int().positive().default(15),
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: z.coerce.number().int().positive().default(1),
    JWT_REFRESH_TOKEN_REMEMBER_ME_DAYS: z.coerce.number().int().positive().default(7),
  })
  .transform(({ COOKIE_SECURE, ...rest }) => ({
    ...rest,
    COOKIE_SECURE: COOKIE_SECURE ?? rest.NODE_ENV === 'production',
  }))
  .refine(
    ({ COOKIE_SECURE, ACCESS_COOKIE_SAMESITE, REFRESH_COOKIE_SAMESITE }) =>
      COOKIE_SECURE || (ACCESS_COOKIE_SAMESITE !== 'none' && REFRESH_COOKIE_SAMESITE !== 'none'),
    { message: 'SameSite=none needs COOKIE_SECURE=true; browsers reject it otherwise.' },
  );

const rootEnv = existsSync(ROOT_ENV_FILE) ? parseEnv(readFileSync(ROOT_ENV_FILE, 'utf8')) : {};

// Real environment variables win, so a deployment can override the shared root .env
export const env = envSchema.parse({ ...rootEnv, ...process.env });
