import { z } from 'zod';

// One `sensor.reading` SSE event from GET /sensors/stream (api monitoring/sensors SensorReadingEvent)
export const sensorReadingSchema = z.object({
  sensor_type: z.literal('weight'),
  device_id: z.string().nullable(),
  value: z.number().nonnegative(),
  unit: z.literal('g'),
  received_at: z.string(),
});
export type SensorReading = z.infer<typeof sensorReadingSchema>;
