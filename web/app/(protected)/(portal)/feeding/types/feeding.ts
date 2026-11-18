import { z } from 'zod';

export const cageSchema = z.object({
  id: z.string(),
  cage_name: z.string(),
  group_code: z.string(),
  is_active: z.boolean(),
});
export type Cage = z.infer<typeof cageSchema>;

export const cagesPageSchema = z.object({
  items: z.array(cageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  size: z.number().int(),
});

export const cageActiveSchema = z.object({
  id: z.uuid(),
  is_active: z.boolean(),
});
export type CageActiveInput = z.infer<typeof cageActiveSchema>;

export const cageGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type CageGroup = z.infer<typeof cageGroupSchema>;

export const SCHEDULE_DAYS = ['every-day', 'weekdays', 'weekends', 'mon-wed-fri-sun'] as const;

export const scheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  feed_time: z.string(),
  days: z.enum(SCHEDULE_DAYS),
  group_codes: z.array(z.string()),
  is_enabled: z.boolean(),
});
export type Schedule = z.infer<typeof scheduleSchema>;

export const schedulesPageSchema = z.object({
  items: z.array(scheduleSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  size: z.number().int(),
});

export const scheduleFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the schedule, like Morning.').max(40, 'Keep the name under 40 characters.'),
  time: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, 'Pick a time on the hour or half hour.'),
  days: z.enum(SCHEDULE_DAYS),
  group_codes: z.array(z.string().regex(/^[A-Z]$/)).min(1, 'Pick at least one group.'),
});
export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>;

export type CreateScheduleInput = Omit<ScheduleFormInput, 'time'> & { feed_time: string };

export const scheduleIdSchema = z.uuid();

export const scheduleEnabledSchema = z.object({
  id: scheduleIdSchema,
  is_enabled: z.boolean(),
});
export type ScheduleEnabledInput = z.infer<typeof scheduleEnabledSchema>;

export type FeedTarget = {
  label: string;
  cageIds: string[];
};
