import { z } from 'zod';

export const activityTypeSchema = z.enum(['account', 'logs', 'batches', 'stickers', 'users', 'security']);
export type ActivityType = z.infer<typeof activityTypeSchema>;

export const activityFilterSchema = z.enum(['all', ...activityTypeSchema.options]);
export type ActivityFilter = z.infer<typeof activityFilterSchema>;

export const activityRangeSchema = z.enum(['today', '7d', '30d', '12m']);
export type ActivityRange = z.infer<typeof activityRangeSchema>;

export const activityResultSchema = z.enum(['all', 'success', 'failed', 'denied']);
export type ActivityResult = z.infer<typeof activityResultSchema>;

export const actorKindSchema = z.enum(['person', 'system', 'unknown']);
export type ActorKind = z.infer<typeof actorKindSchema>;

export const outcomeSchema = z.enum(['SUCCESS', 'FAILURE', 'DENIED', 'ERROR']);
export type Outcome = z.infer<typeof outcomeSchema>;

export const PAGE_STEP = 20;
export const MAX_SHOWN = 100;

export const activitySearchParamsSchema = z.object({
  type: activityFilterSchema.catch('all'),
  q: z.string().trim().max(100).catch(''),
  range: activityRangeSchema.catch('7d'),
  result: activityResultSchema.catch('all'),
  person: z.union([z.literal('everyone'), z.literal('me'), z.uuid()]).catch('everyone'),
  shown: z.coerce.number().int().min(PAGE_STEP).max(MAX_SHOWN).catch(PAGE_STEP),
});
export type ActivitySearchParams = z.infer<typeof activitySearchParamsSchema>;
export type ActivityParamKey = keyof ActivitySearchParams;

export const auditEventSchema = z.object({
  id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  actor_id: z.uuid().nullable(),
  actor_type: z.string(),
  actor_role: z.string().nullable(),
  actor_email: z.string().nullable(),
  source_ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  http_method: z.string().nullable(),
  http_path: z.string().nullable(),
  action: z.string(),
  target_type: z.string().nullable(),
  target_label: z.string().nullable(),
  outcome: outcomeSchema,
  http_status: z.number().int().nullable(),
  reason: z.string().nullable(),
  changes: z.record(z.string(), z.unknown()).nullable(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const auditEventPageSchema = z.object({
  items: z.array(auditEventSchema),
  total: z.number().int().nonnegative(),
});

const apiDecimalSchema = z.union([z.string(), z.number()]).pipe(z.coerce.number());

export const logChangesSchema = z.object({
  after: z.object({
    batch_id: z.number().int().nullable(),
    crab_id: z.number().int(),
    width_mm: apiDecimalSchema.nullable(),
    weight_g: apiDecimalSchema.nullable(),
  }),
});

export const stickerChangesSchema = z.object({
  batch_id: z.number().int(),
  crab_names: z.array(z.string()),
  file_type: z.string(),
});

export const activityDetailsSchema = z.object({
  occurred_at_label: z.string(),
  action: z.string(),
  actor_email: z.string().nullable(),
  actor_role: z.string().nullable(),
  target: z.string().nullable(),
  reason_label: z.string().nullable(),
  reason_code: z.string().nullable(),
  http_status: z.number().int().nullable(),
  request: z.string().nullable(),
  source_ip: z.string().nullable(),
  user_agent: z.string().nullable(),
  changes: z.string().nullable(),
});
export type ActivityDetails = z.infer<typeof activityDetailsSchema>;

export const activityEntrySchema = z.object({
  id: z.string(),
  type: activityTypeSchema,
  event: z.string(),
  outcome: outcomeSchema,
  outcome_label: z.string().nullable(),
  actor_name: z.string(),
  actor_initials: z.string(),
  actor_kind: actorKindSchema,
  time_label: z.string(),
  count: z.number().int().positive(),
  details: activityDetailsSchema,
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const dayGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  entries: z.array(activityEntrySchema),
});
export type DayGroup = z.infer<typeof dayGroupSchema>;

export const personOptionSchema = z.object({ value: z.string(), label: z.string() });
export type PersonOption = z.infer<typeof personOptionSchema>;
