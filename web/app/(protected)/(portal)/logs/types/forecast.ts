import { z } from 'zod';

const predictedDaySchema = z.object({
  day_offset: z.number().int().positive(),
  day: z.iso.date(),
  predicted_width_mm: z.number(),
  predicted_weight_g: z.number(),
});

const crabForecastSchema = z.object({
  crab_id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable(),
  window_start: z.iso.date(),
  window_end: z.iso.date(),
  points: z.array(predictedDaySchema),
});

export const forecastResultSchema = z.object({
  model_version: z.string(),
  forecasts: z.array(crabForecastSchema),
  skipped_crab_ids: z.array(z.number().int().positive()),
  already_forecast_crab_ids: z.array(z.number().int().positive()).default([]),
  old_log_crab_ids: z.array(z.number().int().positive()).default([]),
});
export type ForecastResult = z.infer<typeof forecastResultSchema>;

export const forecastReadinessSchema = z.object({
  recent_crabs: z.number().int().nonnegative(),
  old_log_crabs: z.number().int().nonnegative(),
  already_forecast_crabs: z.number().int().nonnegative(),
  skipped_crabs: z.number().int().nonnegative(),
  oldest_last_log: z.iso.date().nullable(),
  newest_last_log: z.iso.date().nullable(),
});
export type ForecastReadiness = z.infer<typeof forecastReadinessSchema>;

export const runPredictionSchema = z.object({ includeOldLogs: z.boolean() });
export type RunPredictionInput = z.infer<typeof runPredictionSchema>;

export type PredictionOutcome =
  | { kind: 'created'; predicted: number; skipped: number; alreadyPredicted: number; fromOldLogs: number }
  | { kind: 'up-to-date' }
  | { kind: 'not-enough-logs' };
