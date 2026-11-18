import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { forecastReadinessSchema, forecastResultSchema } from '../types/forecast';

export const forecastsApi = {
  readiness: () => bff.get('/forecasts/readiness', forecastReadinessSchema),
  createForEveryCrab: (includeOldLogs: boolean) =>
    bff.post('/forecasts', { include_old_logs: includeOldLogs }, forecastResultSchema),
};
