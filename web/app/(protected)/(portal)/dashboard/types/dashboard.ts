import { z } from 'zod';

import { sensorKindSchema } from '@/types/sensor';
import { severitySchema } from '@/types/severity';

export { sensorKindSchema };
export type { SensorKind } from '@/types/sensor';

export const trendRangeSchema = z.enum(['24h', '7d', '30d']);
export type TrendRange = z.infer<typeof trendRangeSchema>;

export const growthMetricSchema = z.enum(['weight', 'width']);
export type GrowthMetric = z.infer<typeof growthMetricSchema>;

export const summaryStatSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  unit: z.string().nullable(),
});
export type SummaryStat = z.infer<typeof summaryStatSchema>;

export const alertActionSchema = z.object({
  label: z.string(),
  href: z.string(),
  kind: z.enum(['ask', 'feeding']),
});

export const dashboardAlertSchema = z.object({
  id: z.string(),
  severity: severitySchema,
  title: z.string(),
  description: z.string(),
  action: alertActionSchema.nullable(),
});
export type DashboardAlert = z.infer<typeof dashboardAlertSchema>;

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
  severity: severitySchema.nullable(),
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
  week: z.string(),
  actual: z.number().nullable(),
  predicted: z.number().nullable(),
});
export type GrowthPoint = z.infer<typeof growthPointSchema>;
