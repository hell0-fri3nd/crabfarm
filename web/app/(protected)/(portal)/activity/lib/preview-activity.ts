import { activityEntrySchema } from '../types/activity';

import type { ActivityEntry, ActivityType, ActorKind } from '../types/activity';

// Stand-in for the audit endpoints until the BFF is wired up

export const PREVIEW_NOW = new Date(2026, 10, 9, 21, 45);

export const DAYS_PER_LOAD = 2;

export const PREVIEW_DAYS_AVAILABLE = 8;

type EntryTuple = readonly [number, number, number, ActivityType, string, string, ActorKind, string | null];

const REFERENCE_ENTRIES: EntryTuple[] = [
  [0, 21, 42, 'data', 'Logged crab B3-B-02 · 182 g, 8.7 cm', 'Art Lisboa', 'person', null],
  [0, 21, 40, 'data', 'Logged crab B3-B-03 · 141 g, 7.9 cm · flagged −19.9%', 'Art Lisboa', 'person', null],
  [0, 21, 31, 'assistant', 'Suggested skipping the 6:00 AM feed for Group B · not applied', 'Assistant', 'assistant', 'Art Lisboa'],
  [0, 20, 12, 'sensor', 'Ammonia passed 0.5 mg/L', 'System', 'system', null],
  [0, 18, 0, 'feeding', 'Evening schedule ran · 23 of 25 cages · C4, E2 jammed', 'Scheduler', 'system', null],
  [0, 16, 5, 'auth', 'Signed in with PIN', 'Maria Santos', 'person', null],
  [0, 6, 0, 'feeding', 'Morning schedule ran · 25 of 25 cages', 'Scheduler', 'system', null],
  [1, 17, 24, 'users', 'Changed Jun Reyes from Viewer to Operator', 'Art Lisboa', 'person', null],
  [1, 17, 20, 'data', 'Logged crab B2-E-02 · 251 g, 10.2 cm', 'Maria Santos', 'person', null],
  [1, 14, 47, 'feeding', 'Fed cage D3 manually', 'Jun Reyes', 'person', null],
  [1, 14, 43, 'auth', 'Signed out', 'Art Lisboa', 'person', null],
  [1, 13, 0, 'feeding', 'Group D top-up schedule turned off', 'Art Lisboa', 'person', null],
];

const OLDER_TEMPLATES: readonly (readonly [ActivityType, string, string, ActorKind])[] = [
  ['feeding', 'Evening schedule ran · 25 of 25 cages', 'Scheduler', 'system'],
  ['data', 'Logged crab B3-C-02 · 158 g, 8.1 cm', 'Jun Reyes', 'person'],
  ['auth', 'Signed in with password', 'Maria Santos', 'person'],
  ['sensor', 'Oxygen dipped to 5.2 mg/L overnight', 'System', 'system'],
  ['feeding', 'Morning schedule ran · 25 of 25 cages', 'Scheduler', 'system'],
  ['data', 'Printed 15 QR stickers for BATCH-3', 'Art Lisboa', 'person'],
];

const olderEntries = (): EntryTuple[] =>
  Array.from({ length: PREVIEW_DAYS_AVAILABLE - DAYS_PER_LOAD }, (_, dayIndex) => dayIndex + DAYS_PER_LOAD).flatMap((daysAgo) =>
    OLDER_TEMPLATES.slice(0, 3 + (daysAgo % 3)).map(
      ([type, event, actor, kind], index): EntryTuple => [daysAgo, 19 - index * 3, (daysAgo * 7 + index * 13) % 60, type, event, actor, kind, null],
    ),
  );

const toEntry = ([daysAgo, hour, minute, type, event, actor_name, actor_kind, on_behalf_of]: EntryTuple, index: number) => ({
  id: `activity-${index}`,
  type,
  event,
  actor_name,
  actor_kind,
  on_behalf_of,
  occurred_at: new Date(2026, 10, 9 - daysAgo, hour, minute).toISOString(),
});

export const PREVIEW_ACTIVITY: ActivityEntry[] = activityEntrySchema
  .array()
  .parse([...REFERENCE_ENTRIES, ...olderEntries()].map(toEntry))
  .toSorted((first, second) => second.occurred_at.localeCompare(first.occurred_at));
