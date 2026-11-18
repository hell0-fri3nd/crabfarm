import { z } from 'zod';

import { sensorKindSchema, sensorStatusSchema } from '@/types/sensor';

export const deviceNameSchema = z.enum(['scale', 'water_sensors']);
export type DeviceName = z.infer<typeof deviceNameSchema>;

export type DeviceConnection = 'checking' | 'connected' | 'disconnected';

export const deviceAlertSchema = z.object({
  sensor: sensorKindSchema,
  status: sensorStatusSchema,
  value: z.number(),
  normal_range: z.string(),
});
export type DeviceAlert = z.infer<typeof deviceAlertSchema>;

// One `device.status` SSE event from GET /devices/stream (api devices/registry DeviceStatusEvent)
export const deviceStatusEventSchema = z.object({
  device: deviceNameSchema,
  seen_at: z.string(),
  alerts: z.array(deviceAlertSchema).default([]),
});
export type DeviceStatusEvent = z.infer<typeof deviceStatusEventSchema>;
