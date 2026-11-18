import type { GrowthDay, GrowthLog, GrowthMetric, GrowthPoint, GrowthRange } from '../types/dashboard';

export const ALL_BATCHES = 'all';

export const DEFAULT_GROWTH_RANGE: GrowthRange = '12m';

export const GROWTH_RANGE_LABELS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
} as const satisfies Record<GrowthRange, string>;

export const GROWTH_UNITS = { weight: 'g', width: 'mm' } as const satisfies Record<GrowthMetric, string>;

const MEASURE_KEYS = {
  weight: { average: 'weight_avg', count: 'weight_count' },
  width: { average: 'width_avg', count: 'width_count' },
} as const satisfies Record<GrowthMetric, { average: keyof GrowthLog; count: keyof GrowthLog }>;

// Each row is already an average, so rows combine by how many logs stand behind them
const weightedAverage = (rows: GrowthLog[], type: GrowthLog['log_type'], metric: GrowthMetric) => {
  const { average, count } = MEASURE_KEYS[metric];
  const measured = rows.flatMap((row) => {
    const value = row[average];
    return row.log_type === type && value !== null && row[count] > 0 ? [{ value, logs: row[count] }] : [];
  });
  const logs = measured.reduce((sum, row) => sum + row.logs, 0);
  if (logs === 0) return null;
  return Math.round((measured.reduce((sum, row) => sum + row.value * row.logs, 0) / logs) * 10) / 10;
};

export const toGrowthPoints = (days: GrowthDay[], logs: GrowthLog[], batch: string, metric: GrowthMetric): GrowthPoint[] => {
  const inBatch = batch === ALL_BATCHES ? logs : logs.filter(({ batch_id }) => String(batch_id) === batch);
  return days.map(({ key, label }) => {
    const rows = inBatch.filter(({ day_key }) => day_key === key);
    return {
      label,
      actual: weightedAverage(rows, 'actual', metric),
      predicted: weightedAverage(rows, 'prediction', metric),
    };
  });
};
