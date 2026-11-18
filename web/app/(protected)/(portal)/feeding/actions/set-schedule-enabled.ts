'use server';

import type { ActionResult } from '@/types/api';

import { schedulesApi } from '../api/schedules-api';
import { scheduleEnabledSchema } from '../types/feeding';

import type { Schedule, ScheduleEnabledInput } from '../types/feeding';

export const setScheduleEnabled = async (input: ScheduleEnabledInput): Promise<ActionResult<Schedule>> => {
  const parsed = scheduleEnabledSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That schedule isn't valid.", errors: [] };

  const result = await schedulesApi.setEnabled(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
