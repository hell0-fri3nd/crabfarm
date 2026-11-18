import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { dashboardSummarySchema } from '../types/dashboard';

export const dashboardApi = {
  summary: () => bff.get('/dashboard/summary', dashboardSummarySchema),
};
