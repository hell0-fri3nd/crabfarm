import { z } from 'zod';

export const logTypeSchema = z.enum(['actual', 'prediction']);
export type LogType = z.infer<typeof logTypeSchema>;

const apiDecimalSchema = z.union([z.string(), z.number()]).pipe(z.coerce.number());

export const apiLogSchema = z.object({
  id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable(),
  crab_id: z.number().int().positive(),
  user_id: z.uuid(),
  log_type: logTypeSchema,
  width_mm: apiDecimalSchema.nullable(),
  weight_g: apiDecimalSchema.nullable(),
  created_at: z.iso.datetime({ offset: true }),
});
export type ApiLog = z.infer<typeof apiLogSchema>;

export const dailyLogSummarySchema = z.object({
  day: z.iso.date(),
  batch_id: z.number().int().positive().nullable(),
  log_type: logTypeSchema,
  weight_g_avg: z.number().nullable(),
  weight_g_count: z.number().int().nonnegative(),
  width_mm_avg: z.number().nullable(),
  width_mm_count: z.number().int().nonnegative(),
});

export const loggedCrabIdsSchema = z.array(z.number().int().positive());

export const logsPageSchema = z.object({
  items: z.array(apiLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  size: z.number().int(),
});
export type LogsPage = z.infer<typeof logsPageSchema>;
