import { SCHEDULE_DAYS } from '../types/feeding';

import type { Cage, CageGroup, Schedule, ScheduleFormInput } from '../types/feeding';

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatClock = (date: Date) => TIME_FORMAT.format(date);

export const formatTimeInput = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return formatClock(new Date(2000, 0, 1, hours, minutes));
};

export const SCHEDULE_HOURS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const;
export const SCHEDULE_MINUTES = ['00', '30'] as const;
export const SCHEDULE_PERIODS = ['AM', 'PM'] as const;

export type ScheduleTimeParts = {
  hour: (typeof SCHEDULE_HOURS)[number];
  minute: (typeof SCHEDULE_MINUTES)[number];
  period: (typeof SCHEDULE_PERIODS)[number];
};

export const toTimeParts = (time: string): ScheduleTimeParts => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return {
    hour: SCHEDULE_HOURS[(hours + 11) % 12] ?? '12',
    minute: minutes < 30 ? '00' : '30',
    period: hours < 12 ? 'AM' : 'PM',
  };
};

export const toTimeValue = ({ hour, minute, period }: ScheduleTimeParts) => {
  const hours = (Number(hour) % 12) + (period === 'PM' ? 12 : 0);
  return `${String(hours).padStart(2, '0')}:${minute}`;
};

export const SCHEDULE_DAY_LABELS = {
  'every-day': 'Every day',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  'mon-wed-fri-sun': 'Mon, Wed, Fri, Sun',
} as const satisfies Record<(typeof SCHEDULE_DAYS)[number], string>;

export const toCageGroups = (cages: Cage[]): CageGroup[] =>
  [...new Set(cages.map(({ group_code }) => group_code))].sort().map((code) => ({ id: code, name: `Group ${code}` }));

export const toGroupsLabel = (groupCodes: string[], groups: CageGroup[]) => {
  if (groupCodes.length === 0) return 'No groups picked';
  if (groups.length > 0 && groups.every(({ id }) => groupCodes.includes(id))) return 'All groups';
  return groupCodes.length === 1 ? `Group ${groupCodes[0]}` : `Groups ${groupCodes.join(', ')}`;
};

export const toScheduleFormValues = ({ name, feed_time, days, group_codes }: Schedule): ScheduleFormInput => ({
  name,
  time: toTimeValue(toTimeParts(feed_time)),
  days,
  group_codes,
});

export const sortSchedules =(schedules: Schedule[]) =>
  schedules.toSorted((left, right) => left.feed_time.localeCompare(right.feed_time));
