import { format, isSameDay, parseISO, startOfDay, subDays } from 'date-fns';

import { toInitials } from '@/lib/format';

import type { ActivityEntry, ActivityFilter, ActivitySearchParams, ActivityType } from '../types/activity';

export const ACTIVITY_TYPE_LABELS = {
  auth: 'Auth',
  feeding: 'Feeding',
  data: 'Data',
  sensor: 'Sensor',
  users: 'Users',
  assistant: 'Assistant',
} as const satisfies Record<ActivityType, string>;

export const ACTIVITY_FILTER_LABELS = { all: 'All', ...ACTIVITY_TYPE_LABELS } as const satisfies Record<ActivityFilter, string>;

export type DayGroup = {
  key: string;
  label: string;
  entries: ActivityEntry[];
};

export const withinLoadedDays = (entries: ActivityEntry[], daysLoaded: number, now: Date) => {
  const since = startOfDay(subDays(now, daysLoaded - 1));
  return entries.filter(({ occurred_at }) => parseISO(occurred_at) >= since);
};

const matchesQuery = (query: string, entry: ActivityEntry) => {
  const needle = query.toLowerCase();
  return (
    needle === '' ||
    [entry.event, entry.actor_name, entry.on_behalf_of ?? '', ACTIVITY_TYPE_LABELS[entry.type]].some((field) =>
      field.toLowerCase().includes(needle),
    )
  );
};

export const filterActivity = (entries: ActivityEntry[], { type, q }: ActivitySearchParams) =>
  entries.filter((entry) => (type === 'all' || entry.type === type) && matchesQuery(q, entry));

export const countByType = (entries: ActivityEntry[]) =>
  entries.reduce<Partial<Record<ActivityType, number>>>(
    (counts, { type }) => ({ ...counts, [type]: (counts[type] ?? 0) + 1 }),
    {},
  );

export const toDayLabel = (date: Date, now: Date) => {
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, subDays(now, 1))) return 'Yesterday';
  return format(date, 'EEEE d MMM');
};

export const groupByDay = (entries: ActivityEntry[], now: Date): DayGroup[] => {
  const grouped = Object.groupBy(entries, ({ occurred_at }) => format(parseISO(occurred_at), 'yyyy-MM-dd'));
  return Object.entries(grouped).map(([key, dayEntries = []]) => ({
    key,
    label: toDayLabel(parseISO(key), now),
    entries: dayEntries,
  }));
};

export const formatEntryTime = (iso: string) => format(parseISO(iso), 'h:mm a');

export const toActorLabel = ({ actor_kind, actor_name, on_behalf_of }: ActivityEntry) =>
  actor_kind === 'assistant' && on_behalf_of ? `Assistant for ${on_behalf_of}` : actor_name;

export const toActorInitials = ({ actor_kind, actor_name }: ActivityEntry) => {
  if (actor_kind === 'assistant') return 'AI';
  if (actor_kind === 'system') return 'SY';
  return toInitials(actor_name);
};
