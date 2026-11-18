import { z } from 'zod';

export const sensorKindSchema = z.enum(['temperature', 'ph', 'salinity', 'ammonia', 'turbidity', 'oxygen']);

export type SensorKind = z.infer<typeof sensorKindSchema>;

export const sensorStatusSchema = z.enum(['normal', 'warning', 'danger']);

export type SensorStatus = z.infer<typeof sensorStatusSchema>;

export const SENSOR_STATUS_LABELS = {
  normal: 'Normal',
  warning: 'Warning',
  danger: 'Danger',
} as const satisfies Record<SensorStatus, string>;
