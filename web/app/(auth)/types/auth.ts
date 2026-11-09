import { z } from 'zod';

import { pinCodeSchema } from '@/types/pin';

export const signInSchema = z.object({
  email: z.email('Enter a valid email, like you@farm.ph.').trim().toLowerCase(),
  password: z
    .string()
    .min(8, 'Password has at least 8 characters.')
    .max(128, 'Password is at most 128 characters.'),
  remember_me: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;

export const pinSchema = z.object({
  pin: pinCodeSchema,
});

export type PinInput = z.infer<typeof pinSchema>;
