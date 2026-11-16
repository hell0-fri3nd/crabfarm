import { z } from 'zod';

export const currentUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  role: z.string(),
  needs_onboarding: z.boolean(),
  updated_at: z.iso.datetime({ offset: true }).nullable(),
});

export type CurrentUser = z.infer<typeof currentUserSchema>;

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: 'Developer',
  ADMIN: 'Admin',
  STAFF: 'Staff',
};

export const toRoleLabel = (role: string) => ROLE_LABELS[role] ?? role;
