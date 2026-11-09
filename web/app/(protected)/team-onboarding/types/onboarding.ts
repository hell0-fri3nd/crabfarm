import { z } from 'zod';

import { createNewPasswordSchema } from '@/types/password-rules';
import { pinCodeSchema } from '@/types/pin';

export const THEME_OPTIONS = ['light', 'dark'] as const;

export const createPasswordStepSchema = (name: string) =>
  z
    .object({
      new_password: createNewPasswordSchema(name),
      confirm_password: z.string().min(1, 'Type the password again.'),
    })
    .refine(({ new_password, confirm_password }) => new_password === confirm_password, {
      path: ['confirm_password'],
      message: "The passwords don't match. Type it again.",
    });

export type PasswordStepInput = z.infer<ReturnType<typeof createPasswordStepSchema>>;

export const pinStepSchema = z
  .object({ new_pin: pinCodeSchema, confirm_pin: pinCodeSchema })
  .refine(({ new_pin, confirm_pin }) => new_pin === confirm_pin, {
    path: ['confirm_pin'],
    message: "The PINs don't match. Enter it again.",
  });

export type PinStepInput = z.infer<typeof pinStepSchema>;

export const lookStepSchema = z.object({
  theme: z.enum(THEME_OPTIONS),
});

export type LookStepInput = z.infer<typeof lookStepSchema>;
