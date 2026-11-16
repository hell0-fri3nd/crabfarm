'use server';

import { batchesApi } from '@/api/batches-api';

import type { ActionResult } from '@/types/api';
import type { Batch } from '@/types/crab-management';

export const createBatch = async (): Promise<ActionResult<Batch>> => {
  const result = await batchesApi.create();
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
