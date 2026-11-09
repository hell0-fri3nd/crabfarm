import { crabLogSchema, sensorKindSchema, sensorLogSchema } from '../types/logs';

import type { CrabLog, SensorKind, SensorLog } from '../types/logs';

// Stand-in for GET /logs and /sensors/{id}/readings until the BFF is wired up

export const PREVIEW_NOW = new Date(2026, 10, 9, 21, 45);

const at = (daysAgo: number, hour: number, minute: number) =>
  new Date(2026, 10, 9 - daysAgo, hour, minute).toISOString();

const REFERENCE_CRAB_LOGS = [
  ['B3-B-02', 'BATCH-3', 182, 8.7, 3.4, null, 'Art Lisboa', at(0, 21, 42)],
  ['B3-B-03', 'BATCH-3', 141, 7.9, -19.9, 'medium', 'Art Lisboa', at(0, 21, 40)],
  ['B3-A-01', 'BATCH-3', 179, 8.6, 1.7, null, 'Maria Santos', at(0, 16, 12)],
  ['B3-A-02', 'BATCH-3', 170, 8.4, -3.4, null, 'Maria Santos', at(0, 16, 10)],
  ['B3-C-05', 'BATCH-3', 188, 8.9, 6.8, null, 'Jun Reyes', at(0, 7, 55)],
  ['B3-D-03', 'BATCH-3', 165, 8.2, -6.3, null, 'Jun Reyes', at(0, 7, 51)],
  ['B2-E-02', 'BATCH-2', 251, 10.2, 2, null, 'Maria Santos', at(6, 17, 20)],
  ['B2-E-04', 'BATCH-2', 236, 9.8, -4.1, null, 'Maria Santos', at(6, 17, 18)],
] as const;

const LOGGERS = ['Art Lisboa', 'Maria Santos', 'Jun Reyes'];
const ROWS = ['A', 'B', 'C', 'D', 'E'];
export const PREVIEW_BATCHES = ['BATCH-3', 'BATCH-2', 'BATCH-1'] as const;
const BATCH_BASE_WEIGHT = { 'BATCH-3': 170, 'BATCH-2': 240, 'BATCH-1': 310 } as const satisfies Record<(typeof PREVIEW_BATCHES)[number], number>;

const generatedCrabLog = (index: number) => {
  const batch = PREVIEW_BATCHES[index % PREVIEW_BATCHES.length] ?? 'BATCH-3';
  const drift = ((index * 37) % 23) - 11;
  const vsPredicted = Number((((index * 53) % 170) / 10 - 8).toFixed(1));
  return [
    `${batch.replace('BATCH-', 'B')}-${ROWS[index % ROWS.length]}-${String((index % 9) + 1).padStart(2, '0')}`,
    batch,
    BATCH_BASE_WEIGHT[batch] + drift,
    Number((8 + (BATCH_BASE_WEIGHT[batch] + drift - 170) / 40).toFixed(1)),
    vsPredicted,
    vsPredicted <= -15 ? 'medium' : null,
    LOGGERS[index % LOGGERS.length] ?? 'Art Lisboa',
    at(1 + Math.floor(index / 3), 7 + ((index * 5) % 12), (index * 17) % 60),
  ] as const;
};

const toCrabLog = (
  [crab_code, batch_code, weight_g, width_cm, vs_predicted_pct, flag, logged_by, logged_at]:
    | (typeof REFERENCE_CRAB_LOGS)[number]
    | ReturnType<typeof generatedCrabLog>,
  index: number,
) => ({ id: `crab-log-${index}`, crab_code, batch_code, weight_g, width_cm, vs_predicted_pct, flag, logged_by, logged_at });

export const PREVIEW_CRAB_LOGS: CrabLog[] = crabLogSchema
  .array()
  .parse([...REFERENCE_CRAB_LOGS, ...Array.from({ length: 70 }, (_, index) => generatedCrabLog(index))].map(toCrabLog))
  .toSorted((first, second) => second.logged_at.localeCompare(first.logged_at));

type SensorShape = {
  label: string;
  unit: string;
  decimals: number;
  safe_label: string;
  base: number;
  swing: number;
  isOutOfRange: (value: number) => boolean;
  isWatch: (value: number) => boolean;
};

const SENSOR_SHAPES = {
  temperature: {
    label: 'Temperature', unit: '°C', decimals: 1, safe_label: '26–30', base: 28.4, swing: 1.4,
    isOutOfRange: (value) => value < 26 || value > 30, isWatch: (value) => value > 29.5,
  },
  ph: {
    label: 'pH', unit: '', decimals: 1, safe_label: '7.5–8.5', base: 7.9, swing: 0.3,
    isOutOfRange: (value) => value < 7.5 || value > 8.5, isWatch: (value) => value < 7.7,
  },
  salinity: {
    label: 'Salinity', unit: 'ppt', decimals: 1, safe_label: '15–25', base: 18.2, swing: 1.2,
    isOutOfRange: (value) => value < 15 || value > 25, isWatch: (value) => value < 16,
  },
  ammonia: {
    label: 'Ammonia', unit: 'mg/L', decimals: 2, safe_label: '< 0.5', base: 0.32, swing: 0.32,
    isOutOfRange: (value) => value >= 0.5, isWatch: (value) => value >= 0.42,
  },
  oxygen: {
    label: 'Oxygen', unit: 'mg/L', decimals: 1, safe_label: '≥ 5', base: 6.2, swing: 1.1,
    isOutOfRange: (value) => value < 5, isWatch: (value) => value < 5.6,
  },
} as const satisfies Record<SensorKind, SensorShape>;

const SENSOR_KINDS = sensorKindSchema.options;

const toSensorLog = (index: number): SensorLog => {
  const sensor = SENSOR_KINDS[index % SENSOR_KINDS.length] ?? 'temperature';
  const shape: SensorShape = SENSOR_SHAPES[sensor];
  const hoursAgo = Math.floor(index / SENSOR_KINDS.length) * 3;
  const value = Number((shape.base + Math.sin(index * 1.7) * shape.swing).toFixed(shape.decimals));
  const measuredAt = new Date(PREVIEW_NOW.getTime() - hoursAgo * 3_600_000);
  const watchSeverity = shape.isWatch(value) ? 'medium' : null;

  return {
    id: `sensor-log-${index}`,
    sensor,
    sensor_label: shape.label,
    value,
    unit: shape.unit,
    decimals: shape.decimals,
    safe_label: shape.safe_label,
    severity: shape.isOutOfRange(value) ? 'high' : watchSeverity,
    measured_at: measuredAt.toISOString(),
  };
};

export const PREVIEW_SENSOR_LOGS: SensorLog[] = sensorLogSchema
  .array()
  .parse(Array.from({ length: 5 * 80 }, (_, index) => toSensorLog(index)));
