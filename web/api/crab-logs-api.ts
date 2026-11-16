import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { logsPageSchema } from '@/types/crab-log';

export const crabLogsApi = {
  list: (query: URLSearchParams) => bff.get(`/logs?${query}`, logsPageSchema),
};
