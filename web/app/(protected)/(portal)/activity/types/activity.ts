import { z } from 'zod';

export const activityTypeSchema = z.enum(['auth', 'feeding', 'data', 'sensor', 'users', 'assistant']);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityFilterSchema = z.enum(['all', ...activityTypeSchema.options]);
export type ActivityFilter = z.infer<typeof activityFilterSchema>;

export const actorKindSchema = z.enum(['person', 'system', 'assistant']);
export type ActorKind = z.infer<typeof actorKindSchema>;

export const activityEntrySchema = z.object({
  id: z.string(),
  type: activityTypeSchema,
  event: z.string(),
  actor_name: z.string(),
  actor_kind: actorKindSchema,
  on_behalf_of: z.string().nullable(),
  occurred_at: z.iso.datetime(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const activitySearchParamsSchema = z.object({
  type: activityFilterSchema.catch('all'),
  q: z.string().trim().max(100).catch(''),
});
export type ActivitySearchParams = z.infer<typeof activitySearchParamsSchema>;
