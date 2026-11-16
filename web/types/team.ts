import { z } from 'zod';

export const teamMemberSchema = z.object({ id: z.uuid(), name: z.string(), email: z.string() });
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamPageSchema = z.object({ items: z.array(teamMemberSchema) });
