import { z } from 'zod';

export const batchSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});
export type Batch = z.infer<typeof batchSchema>;

export const crabSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  group_by: z.string(),
});
export type Crab = z.infer<typeof crabSchema>;
