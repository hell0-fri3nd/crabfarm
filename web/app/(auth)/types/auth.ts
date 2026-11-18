import { z } from 'zod';

import { PIN_HREF, RETURN_TO_PARAM, SIGN_IN_HREF } from '@/lib/routes';
import { pinCodeSchema } from '@/types/pin';

const SAME_SITE_BASE = 'https://crabfarm.invalid';
const NON_RETURN_PATHS: string[] = [PIN_HREF, SIGN_IN_HREF];

// Parsed as a URL so //host, backslashes and /../ are judged the way the browser will read them
const returnPathSchema = z
  .string()
  .startsWith('/')
  .transform((path) => new URL(path, SAME_SITE_BASE))
  .refine(
    ({ origin, pathname }) =>
      origin === SAME_SITE_BASE && !NON_RETURN_PATHS.includes(pathname) && !pathname.startsWith('/api/'),
  )
  .transform(({ pathname, search }) => `${pathname}${search}`);

export const pinSearchParamsSchema = z.object({
  [RETURN_TO_PARAM]: returnPathSchema.optional().catch(undefined),
});

export const signInSchema = z.object({
  email: z.email('Enter a valid email, like you@farm.ph.').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password has at least 8 characters.')
    .max(128, 'Password is at most 128 characters.'),
  remember_me: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const signedInUserSchema = z.object({
  name: z.string(),
  email: z.email(),
  role: z.string(),
  needs_onboarding: z.boolean(),
});

export type SignedInUser = z.infer<typeof signedInUserSchema>;

export const signInResultSchema = signedInUserSchema.extend({
  access_token: z.string(),
  refresh_token: z.string(),
});

export const pinSchema = z.object({
  pin: pinCodeSchema,
});

export type PinInput = z.infer<typeof pinSchema>;

export const pinResultSchema = signedInUserSchema.extend({
  access_token: z.string(),
});
