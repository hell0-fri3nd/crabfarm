import { z } from 'zod';

export const modelTrainingSchema = z.object({
  training_id: z.uuid(),
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'insufficient_data']),
  outcome: z.enum(['promoted', 'rejected', 'skipped']).nullable(),
  trigger: z.enum(['manual', 'scheduled']),
  started_by: z.uuid().nullable(),
  started_at: z.iso.datetime({ offset: true }),
  finished_at: z.iso.datetime({ offset: true }).nullable(),
  version: z.string().nullable(),
  reason: z.string().nullable(),
});
export type ModelTraining = z.infer<typeof modelTrainingSchema>;

export const modelStateSchema = z.enum(['training', 'missing', 'due', 'ready']);
export type ModelState = z.infer<typeof modelStateSchema>;

export const modelStatusSchema = z.object({
  state: modelStateSchema,
  version: z.string().nullable(),
  trained_at: z.iso.datetime({ offset: true }).nullable(),
  new_logged_days: z.number().int().nullable(),
  retrain_after_days: z.number().int().nonnegative(),
  training: modelTrainingSchema.nullable(),
});
export type ModelStatus = z.infer<typeof modelStatusSchema>;

export const isTrainingActive = (training: ModelTraining | null) =>
  training?.status === 'queued' || training?.status === 'running';
