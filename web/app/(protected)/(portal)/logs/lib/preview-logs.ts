import { sensorKindSchema, sensorLogSchema } from '../types/logs';

import type { SensorKind, SensorLog } from '../types/logs';

// Stand-in for /sensors/{id}/readings until the monitoring API exists

export const PREVIEW_NOW = new Date(2026, 10, 9, 21, 45);

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
