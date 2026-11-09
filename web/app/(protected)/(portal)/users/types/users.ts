import { z } from 'zod';

export const roleSchema = z.enum(['admin', 'operator', 'viewer']);
export type Role = z.infer<typeof roleSchema>;

export const userStatusSchema = z.enum(['active', 'invited', 'deactivated']);
export type UserStatus = z.infer<typeof userStatusSchema>;

export const farmUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  role: roleSchema,
  status: userStatusSchema,
  last_active_label: z.string(),
  is_self: z.boolean(),
});
export type FarmUser = z.infer<typeof farmUserSchema>;

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, 'Enter their full name.').max(80, 'Keep the name under 80 characters.'),
  email: z.email('Enter a valid email, like maria@farm.ph.').trim().toLowerCase(),
  role: roleSchema,
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const usersSearchSchema = z.object({
  q: z.string().trim().max(80).catch(''),
});

export type UserAction =
  | { kind: 'reset'; user: FarmUser }
  | { kind: 'deactivate'; user: FarmUser }
  | { kind: 'role'; user: FarmUser; role: Role };
