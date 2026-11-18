import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { loggedCrabIdsSchema, logsPageSchema } from '@/types/crab-log';

export const crabLogsApi = {
  list: (query: URLSearchParams) => bff.get(`/logs?${query}`, logsPageSchema),
  listCrabIds: (query: URLSearchParams) => bff.get(`/logs/crab-ids?${query}`, loggedCrabIdsSchema),
};
