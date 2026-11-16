import type { ActivityFilter, ActivityRange, ActivityResult, ActivityType } from '../types/activity';

export const ACTIVITY_TYPE_LABELS = {
  account: 'Sign-ins',
  logs: 'Crab logs',
  batches: 'Batches',
  stickers: 'QR stickers',
  users: 'Users',
  security: 'Security',
} as const satisfies Record<ActivityType, string>;

export const ACTIVITY_FILTER_LABELS = { all: 'All', ...ACTIVITY_TYPE_LABELS } as const satisfies Record<ActivityFilter, string>;

export const ACTIVITY_RANGE_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
} as const satisfies Record<ActivityRange, string>;

export const ACTIVITY_RESULT_LABELS = {
  all: 'All results',
  success: 'Succeeded',
  failed: 'Failed',
  denied: 'Denied',
} as const satisfies Record<ActivityResult, string>;
