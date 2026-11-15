import { z } from 'zod';

export const systemEventSchema = z.object({
  type: z.enum(['announcement', 'test']),
  message: z.string(),
  occurred_at: z.iso.datetime({ offset: true }),
});

export type SystemEvent = z.infer<typeof systemEventSchema>;

export const SYSTEM_EVENT_NAMES = ['system.announcement', 'system.test'] as const;
