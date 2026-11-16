import { toDayTimeLabel } from '@/lib/format';

import type { ActivityEvent, RecentActivity } from '../types/profile';

export const RECENT_ACTIVITY_LIMIT = 5;

// Same slice as this card (your own successful actions), which also leaves out the Security events
export const MY_ACTIVITY_HREF = `/activity?${new URLSearchParams({ person: 'me', result: 'success', range: '12m' })}`;

const ACTION_TITLES: Record<string, (target: string) => string> = {
  'auth.sign_in': () => 'Signed in',
  'auth.sign_in.pin': () => 'Unlocked with PIN',
  'auth.sign_out': () => 'Signed out',
  'auth.change_password': () => 'Changed password',
  'auth.change_pin': () => 'Changed PIN',
  'auth.update_me': () => 'Updated name',
  'auth.onboarding': () => 'Finished account setup',
  'user.create': (target) => `Added ${target}`,
  'user.update': (target) => `Updated ${target}`,
  'user.deactivate': (target) => `Deactivated ${target}`,
  'user.reset_credentials': (target) => `Reset credentials for ${target}`,
};

const AREA_BY_PREFIX: Record<string, RecentActivity['area']> = {
  auth: 'Auth',
  user: 'Users',
  assistant: 'Assistant',
};

const toHumanAction = (action: string) => action.replaceAll(/[._]/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());

export const toRecentActivity = (events: ActivityEvent[], now = new Date()): RecentActivity[] =>
  events.map(({ id, action, target_label, occurred_at }) => ({
    id,
    area: AREA_BY_PREFIX[action.split('.')[0] ?? ''] ?? 'Data',
    title: ACTION_TITLES[action]?.(target_label ?? 'a user') ?? toHumanAction(action),
    at_label: toDayTimeLabel(occurred_at, now),
  }));
