import { z } from 'zod';

export const currentUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  needs_onboarding: z.boolean(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Admin',
  STAFF: 'Staff',
  USER: 'User',
};

export const toRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;
