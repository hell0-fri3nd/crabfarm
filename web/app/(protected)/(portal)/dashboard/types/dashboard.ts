import { z } from 'zod';

import { sensorKindSchema, sensorStatusSchema } from '@/types/sensor';
import { severitySchema } from '@/types/severity';

export { sensorKindSchema };
export type { SensorKind } from '@/types/sensor';

export const growthMetricSchema = z.enum(['weight', 'width']);
export type GrowthMetric = z.infer<typeof growthMetricSchema>;

export const growthRangeSchema = z.enum(['7d', '30d', '12m']);
export type GrowthRange = z.infer<typeof growthRangeSchema>;

export const dashboardSummarySchema = z.object({
  crabs_logged_today: z.number().int().nonnegative(),
  crabs_total: z.number().int().nonnegative(),
  next_feed: z
    .object({
      schedule_name: z.string(),
      feed_time: z.string(),
      at: z.string(),
      day_offset: z.number().int().nonnegative(),
    })
    .nullable(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export type SummaryStat = {
  id: string;
  label: string;
  value: string;
  unit: string | null;
  tone?: 'warning' | 'danger';
};

export const sensorReadingSchema = z.object({
  kind: sensorKindSchema,
  label: z.string(),
  unit: z.string(),
  value: z.number().nullable(),
  decimals: z.number().int().min(0),
  safe_min: z.number().nullable(),
  safe_max: z.number().nullable(),
  scale_min: z.number(),
  scale_max: z.number(),
  safe_label: z.string(),
  change_label: z.string(),
  last_seen_label: z.string().nullable(),
  status: sensorStatusSchema.nullable(),
});
export type SensorReading = z.infer<typeof sensorReadingSchema>;

export const seriesPointSchema = z.object({
  at: z.string(),
  value: z.number(),
});
export type SeriesPoint = z.infer<typeof seriesPointSchema>;

export const sensorSeriesSchema = z.object({
  kind: sensorKindSchema,
  label: z.string(),
  unit: z.string(),
  decimals: z.number().int().min(0),
  safe_min: z.number().nullable(),
  safe_max: z.number().nullable(),
  domain_min: z.number(),
  domain_max: z.number(),
  severity: severitySchema.nullable(),
  points: z.array(seriesPointSchema),
});
export type SensorSeries = z.infer<typeof sensorSeriesSchema>;

export const growthPointSchema = z.object({
  label: z.string(),
  actual: z.number().nullable(),
  predicted: z.number().nullable(),
});
export type GrowthPoint = z.infer<typeof growthPointSchema>;

export const growthDaySchema = z.object({ key: z.string(), label: z.string() });
export type GrowthDay = z.infer<typeof growthDaySchema>;

export const growthLogSchema = z.object({
  batch_id: z.number().int().nullable(),
  log_type: z.enum(['actual', 'prediction']),
  weight_avg: z.number().nullable(),
  weight_count: z.number().int().nonnegative(),
  width_avg: z.number().nullable(),
  width_count: z.number().int().nonnegative(),
  day_key: z.string(),
});
export type GrowthLog = z.infer<typeof growthLogSchema>;

export const growthDataSchema = z.object({
  range: growthRangeSchema,
  days: z.array(growthDaySchema),
  logs: z.array(growthLogSchema),
  batches: z.array(z.number().int()),
});
export type GrowthData = z.infer<typeof growthDataSchema>;
