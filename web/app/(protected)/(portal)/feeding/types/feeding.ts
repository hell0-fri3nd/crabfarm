import { z } from 'zod';

export const systemStateSchema = z.enum(['running', 'paused', 'stopped']);
export type SystemState = z.infer<typeof systemStateSchema>;

export const cageStateSchema = z.enum(['ok', 'jammed', 'offline']);
export type CageState = z.infer<typeof cageStateSchema>;

export const cageSchema = z.object({
  id: z.string(),
  code: z.string(),
  group_id: z.string(),
  is_scheduled: z.boolean(),
  state: cageStateSchema,
  last_fed_label: z.string().nullable(),
  issue_label: z.string().nullable(),
});
export type Cage = z.infer<typeof cageSchema>;

export const cageGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type CageGroup = z.infer<typeof cageGroupSchema>;

export const scheduleSchema = z.object({
  id: z.string(),
  time_label: z.string(),
  name: z.string(),
  days_label: z.string(),
  target_label: z.string(),
  is_enabled: z.boolean(),
});
export type Schedule = z.infer<typeof scheduleSchema>;

export const feedDaySchema = z.object({
  day: z.string(),
  dispensed_kg: z.number().nonnegative(),
});
export type FeedDay = z.infer<typeof feedDaySchema>;

export const SCHEDULE_DAYS = ['every-day', 'weekdays', 'mon-wed-fri', 'weekends'] as const;

export const scheduleFormSchema = z.object({
  name: z.string().trim().min(1, 'Name the schedule, like Morning.').max(40, 'Keep the name under 40 characters.'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Pick a time, like 6:00 AM.'),
  days: z.enum(SCHEDULE_DAYS),
  target: z.string().min(1, 'Pick which cages to feed.'),
});
export type ScheduleFormInput = z.infer<typeof scheduleFormSchema>;

export type FeedTarget = {
  label: string;
  cageIds: string[];
};
