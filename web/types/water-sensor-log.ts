import { z } from 'zod';

import { apiDecimalSchema } from '@/types/crab-log';
import { sensorKindSchema, sensorStatusSchema } from '@/types/sensor';

export const apiSensorLogSchema = z.object({
  id: z.number().int().positive(),
  sensor: sensorKindSchema,
  value: apiDecimalSchema,
  status: sensorStatusSchema,
  measured_at: z.iso.datetime({ offset: true }),
  slot_at: z.iso.datetime({ offset: true }),
});
export type ApiSensorLog = z.infer<typeof apiSensorLogSchema>;

export const apiSensorLogsPageSchema = z.object({
  items: z.array(apiSensorLogSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  size: z.number().int(),
});
export type ApiSensorLogsPage = z.infer<typeof apiSensorLogsPageSchema>;

export const sensorStatusCountsSchema = z.object({
  normal: z.number().int().nonnegative(),
  warning: z.number().int().nonnegative(),
  danger: z.number().int().nonnegative(),
});
export type SensorStatusCounts = z.infer<typeof sensorStatusCountsSchema>;
