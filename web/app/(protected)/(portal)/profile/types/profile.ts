import { z } from 'zod';

import { createNewPasswordSchema } from '@/types/password-rules';
import { PIN_LENGTH, pinCodeSchema } from '@/types/pin';

export const profileSchema = z.object({
  name: z.string(),
  email: z.email(),
  role: z.string(),
  password_changed_label: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const nameFormSchema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters.').max(80, 'Use at most 80 characters.'),
});
export type NameFormInput = z.infer<typeof nameFormSchema>;

export const createPasswordFormSchema = (name: string) =>
  z
    .object({
      current_password: z
        .string()
        .min(8, 'Your current password has at least 8 characters.')
        .max(128, 'Use at most 128 characters.'),
      new_password: createNewPasswordSchema(name),
      confirm_password: z.string().min(1, 'Type the new password again.'),
    })
    .refine(({ current_password, new_password }) => current_password !== new_password, {
      path: ['new_password'],
      message: 'Pick a password different from your current one.',
    })
    .refine(({ new_password, confirm_password }) => new_password === confirm_password, {
      path: ['confirm_password'],
      message: "The passwords don't match. Type it again.",
    });
export type PasswordFormInput = z.infer<ReturnType<typeof createPasswordFormSchema>>;

const SEQUENTIAL_PIN = '0123456789'.slice(0, PIN_LENGTH);

const isEasyPin = (pin: string) => new Set(pin).size === 1 || pin === SEQUENTIAL_PIN || pin === '1234';

export const pinFormSchema = z
  .object({
    current_pin: pinCodeSchema,
    new_pin: pinCodeSchema.refine((pin) => !isEasyPin(pin), {
      message: `Pick a PIN that isn't ${SEQUENTIAL_PIN}, 1234 or one repeated digit.`,
    }),
    confirm_pin: pinCodeSchema,
  })
  .refine(({ current_pin, new_pin }) => current_pin !== new_pin, {
    path: ['new_pin'],
    message: 'Pick a PIN different from your current one.',
  })
  .refine(({ new_pin, confirm_pin }) => new_pin === confirm_pin, {
    path: ['confirm_pin'],
    message: "The PINs don't match. Enter it again.",
  });
export type PinFormInput = z.infer<typeof pinFormSchema>;

export const themeOptionSchema = z.enum(['light', 'dark']);
export type ThemeOption = z.infer<typeof themeOptionSchema>;

export const activityAreaSchema = z.enum(['Data', 'Assistant', 'Users', 'Auth']);

export const recentActivitySchema = z.object({
  id: z.string(),
  area: activityAreaSchema,
  title: z.string(),
  at_label: z.string(),
});
export type RecentActivity = z.infer<typeof recentActivitySchema>;
