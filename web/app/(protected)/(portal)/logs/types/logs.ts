import { z } from 'zod';

import { logTypeSchema } from '@/types/crab-log';
import { sensorKindSchema, sensorStatusSchema } from '@/types/sensor';

export const logTabSchema = z.enum(['crab', 'sensor']);
export type LogTab = z.infer<typeof logTabSchema>;

export const logViewSchema = z.enum(['table', 'chart']);
export type LogView = z.infer<typeof logViewSchema>;

export const datePresetSchema = z.enum(['today', '7d', '30d', '12m']);
export type DatePreset = z.infer<typeof datePresetSchema>;

export const levelFilterSchema = z.enum(['all', ...sensorStatusSchema.options]);
export type LevelFilter = z.infer<typeof levelFilterSchema>;

export { sensorKindSchema };
export type { SensorKind } from '@/types/sensor';

export { logTypeSchema };
export type { ApiLog, LogType, LogsPage } from '@/types/crab-log';

export const logTypeFilterSchema = z.enum(['all', ...logTypeSchema.options]);
export type LogTypeFilter = z.infer<typeof logTypeFilterSchema>;

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

export const chartPointSchema = z.object({
  day: z.string(),
  label: z.string(),
  actual_weight_g: z.number().nullable(),
  forecast_weight_g: z.number().nullable(),
  actual_width_mm: z.number().nullable(),
  forecast_width_mm: z.number().nullable(),
});
export type ChartPoint = z.infer<typeof chartPointSchema>;

export const crabLogChartSchema = z.object({
  crab_name: z.string().nullable(),
  crab_code: z.string().nullable(),
  crab_names: z.array(z.string()),
  points: z.array(chartPointSchema),
  plotted: z.number().int(),
  crab_total: z.number().int(),
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
  normal_range: z.string(),
  status: sensorStatusSchema,
  measured_at: z.iso.datetime({ offset: true }),
});
export type SensorLog = z.infer<typeof sensorLogSchema>;

export const sensorLogPageSchema = z.object({
  rows: z.array(sensorLogSchema),
  page: z.number().int(),
  pageCount: z.number().int(),
  start: z.number().int(),
  end: z.number().int(),
  total: z.number().int(),
});
export type SensorLogPage = z.infer<typeof sensorLogPageSchema>;

export type { ApiSensorLog, ApiSensorLogsPage, SensorStatusCounts } from '@/types/water-sensor-log';

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
