import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';

import { scheduleSchema, schedulesPageSchema } from '../types/feeding';

import type { CreateScheduleInput, ScheduleEnabledInput } from '../types/feeding';

const MAX_SCHEDULES = 100;

export const schedulesApi = {
  list: () => bff.get(`/schedules?size=${MAX_SCHEDULES}`, schedulesPageSchema),
  create: (input: CreateScheduleInput) => bff.post('/schedules', input, scheduleSchema),
  update: (id: string, input: CreateScheduleInput) => bff.patch(`/schedules/${id}`, input, scheduleSchema),
  setEnabled: ({ id, is_enabled }: ScheduleEnabledInput) => bff.patch(`/schedules/${id}`, { is_enabled }, scheduleSchema),
  remove: (id: string) => bff.delete(`/schedules/${id}`, z.null()),
  restore: (id: string) => bff.post(`/schedules/${id}/restore`, undefined, scheduleSchema),
};
