import { z } from 'zod';

import { sensorKindSchema, sensorStatusSchema } from '@/types/sensor';

// One `water_sensor.reading` SSE event from GET /water-sensors/stream (api devices/water_sensors WaterSensorReadingEvent)
export const waterSensorReadingSchema = z.object({
  device_id: z.string().nullable(),
  temperature_c: z.number(),
  ph: z.number(),
  salinity_ppt: z.number(),
  ammonia_mg_l: z.number(),
  turbidity_ntu: z.number(),
  do_mg_l: z.number(),
  statuses: z.record(sensorKindSchema, sensorStatusSchema),
  received_at: z.string(),
});
export type WaterSensorReading = z.infer<typeof waterSensorReadingSchema>;
