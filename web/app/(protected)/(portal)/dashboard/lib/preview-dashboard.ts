import {
  dashboardAlertSchema,
  growthPointSchema,
  sensorReadingSchema,
  sensorSeriesSchema,
  summaryStatSchema,
} from '../types/dashboard';

import type { GrowthMetric, SensorReading, SensorSeries, TrendRange } from '../types/dashboard';

// Preview data shaped like the API until the dashboard reads /sensors, /forecasts and the alerts feed

export const PREVIEW_BRIEFING =
  "Ammonia crossed the safe limit at 8:12 PM and is still climbing. That's the one thing to handle tonight. Evening feeding reached 23 of 25 cages; C4 and E2 jammed. Temperature, pH and salinity are steady.";

export const PREVIEW_SUMMARY = summaryStatSchema.array().parse([
  { id: 'cages-fed', label: 'Cages fed tonight', value: '23', unit: 'of 25' },
  { id: 'crabs-logged', label: 'Crabs logged today', value: '14', unit: null },
  { id: 'batch-vs-plan', label: 'Batch 3 vs plan', value: '+3.4', unit: '%' },
  { id: 'next-feed', label: 'Next feed', value: '6:00', unit: 'AM' },
]);

export const PREVIEW_ALERTS = dashboardAlertSchema.array().parse([
  {
    id: 'ammonia-high',
    severity: 'high',
    title: 'Ammonia at 0.62 mg/L',
    description: 'Above 0.5 since 8:12 PM, up 0.18 in three hours.',
    action: { label: 'Ask what to do', href: '/assistant', kind: 'ask' },
  },
  {
    id: 'skipped-feed-c4-e2',
    severity: 'medium',
    title: 'C4 and E2 skipped the 6:00 PM feed',
    description: 'Both dispensers reported a jam. Clear them before 6:00 AM.',
    action: { label: 'Open Feeding', href: '/feeding', kind: 'feeding' },
  },
  {
    id: 'oxygen-drop',
    severity: 'low',
    title: 'Oxygen down 1.4 mg/L since 3:00 PM',
    description: "Still above 5. Usual overnight dip, but it's dropping faster than last week.",
    action: null,
  },
]);

export const PREVIEW_READINGS: SensorReading[] = sensorReadingSchema.array().parse([
  {
    kind: 'temperature', label: 'Temperature', unit: '°C', value: 28.6, decimals: 1,
    safe_min: 26, safe_max: 30, scale_min: 20, scale_max: 34,
    safe_label: 'Safe 26–30', change_label: '+0.3 in 1 h', last_seen_label: null, severity: null,
  },
  {
    kind: 'ph', label: 'pH', unit: '', value: 7.9, decimals: 1,
    safe_min: 7.5, safe_max: 8.5, scale_min: 6, scale_max: 10,
    safe_label: 'Safe 7.5–8.5', change_label: 'steady', last_seen_label: null, severity: null,
  },
  {
    kind: 'salinity', label: 'Salinity', unit: 'ppt', value: 18, decimals: 1,
    safe_min: 15, safe_max: 25, scale_min: 0, scale_max: 35,
    safe_label: 'Safe 15–25', change_label: '−0.2 in 1 h', last_seen_label: null, severity: null,
  },
  {
    kind: 'ammonia', label: 'Ammonia', unit: 'mg/L', value: 0.62, decimals: 2,
    safe_min: 0, safe_max: 0.5, scale_min: 0, scale_max: 2.5,
    safe_label: 'Safe < 0.5', change_label: '+0.18 in 3 h', last_seen_label: null, severity: 'high',
  },
  {
    kind: 'oxygen', label: 'Oxygen', unit: 'mg/L', value: 5.4, decimals: 1,
    safe_min: 5, safe_max: null, scale_min: 0, scale_max: 12,
    safe_label: 'Safe ≥ 5', change_label: '−1.4 in 6 h', last_seen_label: null, severity: 'low',
  },
]);

const POINTS_PER_RANGE = { '24h': 25, '7d': 29, '30d': 31 } as const satisfies Record<TrendRange, number>;

const SERIES_SHAPES = {
  temperature: { start: 28.2, end: 28.6, wave: 0.6, domain: [26, 31] },
  ph: { start: 7.85, end: 7.9, wave: 0.08, domain: [7.2, 8.6] },
  salinity: { start: 18.3, end: 18, wave: 0.1, domain: [14, 26] },
  ammonia: { start: 0.18, end: 0.62, wave: 0.03, domain: [0, 0.8] },
  oxygen: { start: 7, end: 5.4, wave: 0.15, domain: [4, 8] },
} as const satisfies Record<SensorReading['kind'], { start: number; end: number; wave: number; domain: [number, number] }>;

const toSeries = (reading: SensorReading, range: TrendRange): SensorSeries => {
  const shape = SERIES_SHAPES[reading.kind];
  const count = POINTS_PER_RANGE[range];
  const points = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const drift = shape.start + (shape.end - shape.start) * progress ** 2;
    const value = index === count - 1 ? shape.end : drift + Math.sin(progress * Math.PI * 2.5) * shape.wave;
    return { at: `p${index}`, value: Number(value.toFixed(3)) };
  });

  return sensorSeriesSchema.parse({
    kind: reading.kind,
    label: reading.label,
    unit: reading.unit,
    decimals: reading.decimals,
    safe_min: reading.safe_min,
    safe_max: reading.safe_max,
    domain_min: shape.domain[0],
    domain_max: shape.domain[1],
    severity: reading.severity,
    points,
  });
};

export const getPreviewSeries = (range: TrendRange) => PREVIEW_READINGS.map((reading) => toSeries(reading, range));

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10'];

const GROWTH_CURVES = {
  weight: { actual: [38, 55, 70, 90, 110, 122, 146, 162, 182, null], predicted: [36, 54, 68, 86, 106, 124, 144, 160, 176, 192] },
  width: { actual: [4.2, 4.8, 5.3, 5.9, 6.4, 6.8, 7.4, 7.9, 8.7, null], predicted: [4.1, 4.7, 5.2, 5.8, 6.3, 6.9, 7.3, 7.9, 8.5, 9.0] },
} as const satisfies Record<GrowthMetric, { actual: (number | null)[]; predicted: number[] }>;

export const GROWTH_UNITS = { weight: 'g', width: 'cm' } as const satisfies Record<GrowthMetric, string>;

export const PREVIEW_BATCHES = ['BATCH-3', 'BATCH-2', 'BATCH-1'] as const;

export const getPreviewGrowth = (metric: GrowthMetric) =>
  growthPointSchema.array().parse(
    WEEKS.map((week, index) => ({
      week,
      actual: GROWTH_CURVES[metric].actual[index] ?? null,
      predicted: GROWTH_CURVES[metric].predicted[index] ?? null,
    })),
  );
