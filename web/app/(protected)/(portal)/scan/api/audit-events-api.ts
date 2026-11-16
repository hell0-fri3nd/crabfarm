import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { RECENT_LOGS } from '../lib/recent-logs';
import { logCreatedPageSchema } from '../types/scan';

// The API scopes rows by role: ADMIN and DEVELOPER get everyone's logs, STAFF only their own
const recentLogsQuery = new URLSearchParams({
  action: 'log.create',
  outcome: 'SUCCESS',
  size: String(RECENT_LOGS),
  sort: '-occurred_at',
});

export const auditEventsApi = {
  listRecentLogs: () => bff.get(`/audit-events?${recentLogsQuery}`, logCreatedPageSchema),
};
