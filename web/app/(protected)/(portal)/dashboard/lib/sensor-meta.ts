import type { TrendRange } from '../types/dashboard';

export const TREND_RANGE_LABELS = {
  '24h': '24 h',
  '7d': '7 days',
  '30d': '30 days',
} as const satisfies Record<TrendRange, string>;

export const TREND_RANGE_START_LABELS = {
  '24h': '9:40 PM yesterday',
  '7d': '7 days ago',
  '30d': '30 days ago',
} as const satisfies Record<TrendRange, string>;

export const formatReading = (value: number, decimals: number) => value.toFixed(decimals);

export const toMeterPercent = (value: number, min: number, max: number) =>
  Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
