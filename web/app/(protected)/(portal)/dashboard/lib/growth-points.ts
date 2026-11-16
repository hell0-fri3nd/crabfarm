import type { GrowthDay, GrowthLog, GrowthMetric, GrowthPoint } from '../types/dashboard';

export const ALL_BATCHES = 'all';

export const GROWTH_UNITS = { weight: 'g', width: 'mm' } as const satisfies Record<GrowthMetric, string>;

const MEASURE_KEY = { weight: 'weight_g', width: 'width_mm' } as const satisfies Record<GrowthMetric, keyof GrowthLog>;

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

const valuesOf = (logs: GrowthLog[], type: GrowthLog['log_type'], metric: GrowthMetric) =>
  logs.flatMap((log) => {
    const value = log[MEASURE_KEY[metric]];
    return log.log_type === type && typeof value === 'number' ? [value] : [];
  });

export const toGrowthPoints = (days: GrowthDay[], logs: GrowthLog[], batch: string, metric: GrowthMetric): GrowthPoint[] => {
  const inBatch = batch === ALL_BATCHES ? logs : logs.filter(({ batch_id }) => String(batch_id) === batch);
  return days.map(({ key, label }) => {
    const dayLogs = inBatch.filter(({ day_key }) => day_key === key);
    return {
      label,
      actual: average(valuesOf(dayLogs, 'actual', metric)),
      predicted: average(valuesOf(dayLogs, 'prediction', metric)),
    };
  });
};
