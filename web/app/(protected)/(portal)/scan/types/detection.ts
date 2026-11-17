import { z } from 'zod';

export const detectionTicketSchema = z.object({
  ticket: z.string().min(1),
  expires_at: z.string(),
});
export type DetectionTicket = z.infer<typeof detectionTicketSchema>;

const unitSchema = z.number().min(0).max(1);

export const detectionBoxSchema = z.object({
  x1: unitSchema,
  y1: unitSchema,
  x2: unitSchema,
  y2: unitSchema,
  confidence: unitSchema,
  label: z.string(),
});
export type DetectionBox = z.infer<typeof detectionBoxSchema>;

export const detectionMeasurementSchema = z.object({
  width_mm: z.number().positive(),
  mm_per_px: z.number().positive(),
  box_index: z.number().int().nonnegative(),
  scale_source: z.enum(['sticker', 'stand']),
  fov_deg: z.number().positive(),
  box_width_px: z.number().nonnegative(),
  frame_long_px: z.number().int().positive(),
  sticker_mm: z.number().positive(),
  qr_side_mm: z.number().positive(),
  qr_side_px: z.number().positive().nullable(),
  distance_mm: z.number().positive(),
  offset_mm: z.number(),
});
export type DetectionMeasurement = z.infer<typeof detectionMeasurementSchema>;

const detectionResultSchema = z.object({
  type: z.literal('result'),
  frame_id: z.number().int().nonnegative(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  inference_ms: z.number().nonnegative(),
  boxes: z.array(detectionBoxSchema),
  measurement: detectionMeasurementSchema.nullable().default(null),
});
export type DetectionResult = z.infer<typeof detectionResultSchema>;

export const detectionMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready'), model: z.string(), image_size: z.number().int().positive() }),
  detectionResultSchema,
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
]);

// Close codes the API sends (api/context 02 §10a)
export const DETECTION_CLOSE = {
  sessionExpired: 4001,
  badTicket: 4401,
  originNotAllowed: 4403,
  frameTooLarge: 4413,
  tryAgainLater: 1013,
} as const;

export type DetectionStatus = 'off' | 'connecting' | 'live' | 'unavailable';
