import { SCHEDULE_DAYS } from '../types/feeding';

const TIME_FORMAT = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

export const formatClock = (date: Date) => TIME_FORMAT.format(date);

export const formatTimeInput = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return formatClock(new Date(2000, 0, 1, hours, minutes));
};

export const SCHEDULE_DAY_LABELS = {
  'every-day': 'Every day',
  weekdays: 'Weekdays',
  'mon-wed-fri': 'Mon, Wed, Fri',
  weekends: 'Weekends',
} as const satisfies Record<(typeof SCHEDULE_DAYS)[number], string>;

export const ALL_GROUPS_TARGET = 'all';

export const formatKg = (value: number) => `${value.toFixed(2)} kg`;
