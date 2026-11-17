import { z } from 'zod';

// One `scale.reading` SSE event from GET /scales/stream (api devices/scales ScaleReadingEvent)
export const scaleReadingSchema = z.object({
  device_id: z.string().nullable(),
  weight_g: z.number().nonnegative(),
  received_at: z.string(),
});
export type ScaleReading = z.infer<typeof scaleReadingSchema>;
