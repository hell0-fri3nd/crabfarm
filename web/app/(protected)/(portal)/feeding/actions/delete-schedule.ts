'use server';

import type { ActionResult } from '@/types/api';

import { schedulesApi } from '../api/schedules-api';
import { scheduleIdSchema } from '../types/feeding';

export const deleteSchedule = async (id: string): Promise<ActionResult<null>> => {
  const parsed = scheduleIdSchema.safeParse(id);
  if (!parsed.success) return { ok: false, message: "That schedule isn't valid.", errors: [] };

  const result = await schedulesApi.remove(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: null };
};
