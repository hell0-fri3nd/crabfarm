import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { auditEventPageSchema } from '../types/activity';

// The API scopes rows by role: STAFF only ever get their own events, whatever the query says
export const auditEventsApi = {
  list: (query: URLSearchParams) => bff.get(`/audit-events?${query}`, auditEventPageSchema),
};
