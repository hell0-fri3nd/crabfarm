import { cageGroupSchema, cageSchema, feedDaySchema, scheduleSchema } from '../types/feeding';

import type { Cage } from '../types/feeding';

// Preview data shaped like the API until Feeding reads /devices, /devices/stream and the schedules resource

export const PREVIEW_NEXT_FEED = { time_label: '6:00 AM', name: 'Morning' } as const;

export const PREVIEW_PLAN_KG = 1.4;

export const PREVIEW_GROUPS = cageGroupSchema.array().parse(
  ['A', 'B', 'C', 'D', 'E'].map((letter) => ({ id: letter, name: `Group ${letter}` })),
);

const CAGE_ISSUES: Record<string, Pick<Cage, 'state' | 'issue_label'>> = {
  C4: { state: 'jammed', issue_label: 'Jammed at 6:00 PM' },
  E2: { state: 'jammed', issue_label: 'Jammed at 6:00 PM' },
  B5: { state: 'offline', issue_label: 'Offline since 5:40 PM · check its power' },
};

export const PREVIEW_CAGES = cageSchema.array().parse(
  PREVIEW_GROUPS.flatMap(({ id: groupId }) =>
    [1, 2, 3, 4, 5].map((number) => {
      const code = `${groupId}${number}`;
      const issue = CAGE_ISSUES[code];
      return {
        id: code.toLowerCase(),
        code,
        group_id: groupId,
        is_scheduled: true,
        state: issue?.state ?? 'ok',
        last_fed_label: issue ? null : '6:00 PM',
        issue_label: issue?.issue_label ?? null,
      };
    }),
  ),
);

export const PREVIEW_SCHEDULES = scheduleSchema.array().parse([
  { id: 'morning', time_label: '6:00 AM', name: 'Morning', days_label: 'Every day', target_label: 'All groups', is_enabled: true },
  { id: 'group-d-top-up', time_label: '12:00 PM', name: 'Group D top-up', days_label: 'Mon, Wed, Fri', target_label: 'Group D', is_enabled: false },
  { id: 'evening', time_label: '6:00 PM', name: 'Evening', days_label: 'Every day', target_label: 'All groups', is_enabled: true },
]);

export const PREVIEW_FEED_DAYS = feedDaySchema.array().parse([
  { day: 'Thu', dispensed_kg: 1.42 },
  { day: 'Fri', dispensed_kg: 1.41 },
  { day: 'Sat', dispensed_kg: 1.32 },
  { day: 'Sun', dispensed_kg: 1.43 },
  { day: 'Mon', dispensed_kg: 1.4 },
  { day: 'Tue', dispensed_kg: 1.41 },
  { day: 'Wed', dispensed_kg: 1.3 },
]);
