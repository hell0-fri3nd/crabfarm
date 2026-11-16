import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { logsPageSchema } from '../types/logs';

export const logsApi = {
  list: (query: URLSearchParams) => bff.get(`/logs?${query}`, logsPageSchema),
};
