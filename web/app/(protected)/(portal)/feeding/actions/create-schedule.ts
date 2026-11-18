'use server';

import type { ActionResult } from '@/types/api';

import { schedulesApi } from '../api/schedules-api';
import { scheduleFormSchema } from '../types/feeding';

import type { Schedule, ScheduleFormInput } from '../types/feeding';

export const createSchedule = async (input: ScheduleFormInput): Promise<ActionResult<Schedule>> => {
  const parsed = scheduleFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check the highlighted fields.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const { time, ...schedule } = parsed.data;
  const result = await schedulesApi.create({ ...schedule, feed_time: time });
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
