import { z } from 'zod';

import { sensorKindSchema } from '@/types/sensor';

const thresholdBandSchema = z.tuple([z.number().nullable(), z.number().nullable()]);

// One row of GET /water-sensors/thresholds; the values come from the root .env through the API
export const waterSensorThresholdSchema = z.object({
  sensor: sensorKindSchema,
  warning: z.array(thresholdBandSchema),
  danger: z.array(thresholdBandSchema),
  normal_min: z.number().nullable(),
  normal_max: z.number().nullable(),
  normal_range: z.string(),
});
export type WaterSensorThreshold = z.infer<typeof waterSensorThresholdSchema>;
