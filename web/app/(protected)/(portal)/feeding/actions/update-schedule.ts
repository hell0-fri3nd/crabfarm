'use server';

import type { ActionResult } from '@/types/api';

import { schedulesApi } from '../api/schedules-api';
import { scheduleFormSchema, scheduleIdSchema } from '../types/feeding';

import type { Schedule, ScheduleFormInput } from '../types/feeding';

export const updateSchedule = async (id: string, input: ScheduleFormInput): Promise<ActionResult<Schedule>> => {
  const parsedId = scheduleIdSchema.safeParse(id);
  if (!parsedId.success) return { ok: false, message: "That schedule isn't valid.", errors: [] };

  const parsed = scheduleFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check the highlighted fields.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const { time, ...schedule } = parsed.data;
  const result = await schedulesApi.update(parsedId.data, { ...schedule, feed_time: time });
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
