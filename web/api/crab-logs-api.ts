import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { dailyLogSummarySchema, loggedCrabIdsSchema, logsPageSchema } from '@/types/crab-log';

export const crabLogsApi = {
  list: (query: URLSearchParams) => bff.get(`/logs?${query}`, logsPageSchema),
  dailySummary: (query: URLSearchParams) => bff.get(`/logs/daily-summary?${query}`, dailyLogSummarySchema.array()),
  listCrabIds: (query: URLSearchParams) => bff.get(`/logs/crab-ids?${query}`, loggedCrabIdsSchema),
};
