import { z } from 'zod';

import { sensorKindSchema } from '@/types/sensor';
import { severitySchema } from '@/types/severity';

export const logTabSchema = z.enum(['crab', 'sensor']);
export type LogTab = z.infer<typeof logTabSchema>;

export const logViewSchema = z.enum(['table', 'chart']);
export type LogView = z.infer<typeof logViewSchema>;
export const datePresetSchema = z.enum(['today', '7d', '30d']);
export type DatePreset = z.infer<typeof datePresetSchema>;

export const levelFilterSchema = z.enum(['all', 'high', 'medium', 'low', 'normal']);
export type LevelFilter = z.infer<typeof levelFilterSchema>;

export { sensorKindSchema };
export type { SensorKind } from '@/types/sensor';

export const logTypeSchema = z.enum(['actual', 'prediction']);
export type LogType = z.infer<typeof logTypeSchema>;

export const logTypeFilterSchema = z.enum(['all', ...logTypeSchema.options]);
export type LogTypeFilter = z.infer<typeof logTypeFilterSchema>;

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

export const logsPageSchema = z.object({
  items: z.array(apiLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  size: z.number().int(),
});
export type LogsPage = z.infer<typeof logsPageSchema>;

export const crabLogSchema = z.object({
  id: z.string(),
  crab_code: z.string(),
  batch_label: z.string(),
  log_type: logTypeSchema,
  width_mm: z.number().nullable(),
  weight_g: z.number().nullable(),
  logged_by: z.string(),
  logged_at: z.iso.datetime({ offset: true }),
});
export type CrabLog = z.infer<typeof crabLogSchema>;

export const crabLogPageSchema = z.object({
  rows: z.array(crabLogSchema),
  page: z.number().int(),
  pageCount: z.number().int(),
  start: z.number().int(),
  end: z.number().int(),
  total: z.number().int(),
});
export type CrabLogPage = z.infer<typeof crabLogPageSchema>;

export const chartBucketSchema = z.enum(['day', 'hour', 'minute', 'second']);
export type ChartBucket = z.infer<typeof chartBucketSchema>;

export const chartSeriesSchema = z.enum(['actual', 'prediction']);
export type ChartSeries = z.infer<typeof chartSeriesSchema>;

export const chartPointSchema = z.object({
  bucket_key: z.string(),
  label: z.string(),
  actual_weight_g: z.number().nullable(),
  predicted_weight_g: z.number().nullable(),
  actual_width_mm: z.number().nullable(),
  predicted_width_mm: z.number().nullable(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const crabLogChartSchema = z.object({
  bucket: chartBucketSchema,
  points: z.array(chartPointSchema),
  plotted: z.number().int(),
  total: z.number().int(),
});
export type CrabLogChart = z.infer<typeof crabLogChartSchema>;

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
  batch: z.union([z.literal('all'), z.string().regex(/^\d{1,9}$/)]).catch('all'),
  level: levelFilterSchema.catch('all'),
  type: logTypeFilterSchema.catch('all'),
  view: logViewSchema.catch('table'),
});
export type LogsSearchParams = z.infer<typeof logsSearchParamsSchema>;

export type LogsParamKey = keyof LogsSearchParams;
