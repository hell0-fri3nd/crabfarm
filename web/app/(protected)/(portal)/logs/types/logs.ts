import { z } from 'zod';

import { sensorKindSchema } from '@/types/sensor';
import { severitySchema } from '@/types/severity';

export const logTabSchema = z.enum(['crab', 'sensor']);
export type LogTab = z.infer<typeof logTabSchema>;

export const datePresetSchema = z.enum(['today', '7d', '30d']);
export type DatePreset = z.infer<typeof datePresetSchema>;

export const levelFilterSchema = z.enum(['all', 'high', 'medium', 'low', 'normal']);
export type LevelFilter = z.infer<typeof levelFilterSchema>;

export { sensorKindSchema };
export type { SensorKind } from '@/types/sensor';

export const crabLogSchema = z.object({
  id: z.string(),
  crab_code: z.string(),
  batch_code: z.string(),
  weight_g: z.number().positive(),
  width_cm: z.number().positive(),
  vs_predicted_pct: z.number(),
  flag: severitySchema.nullable(),
  logged_by: z.string(),
  logged_at: z.iso.datetime(),
});
export type CrabLog = z.infer<typeof crabLogSchema>;

export const sensorLogSchema = z.object({
  id: z.string(),
  sensor: sensorKindSchema,
  sensor_label: z.string(),
  value: z.number(),
  unit: z.string(),
  decimals: z.number().int().min(0),
  safe_label: z.string(),
  severity: severitySchema.nullable(),
  measured_at: z.iso.datetime(),
});
export type SensorLog = z.infer<typeof sensorLogSchema>;

const dateParamSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const logsSearchParamsSchema = z.object({
  tab: logTabSchema.catch('crab'),
  q: z.string().trim().max(100).catch(''),
  page: z.coerce.number().int().min(1).catch(1),
  preset: datePresetSchema.catch('7d'),
  from: dateParamSchema.optional().catch(undefined),
  to: dateParamSchema.optional().catch(undefined),
  batch: z.string().trim().min(1).catch('all'),
  level: levelFilterSchema.catch('all'),
});
export type LogsSearchParams = z.infer<typeof logsSearchParamsSchema>;

export type LogsParamKey = keyof LogsSearchParams;
