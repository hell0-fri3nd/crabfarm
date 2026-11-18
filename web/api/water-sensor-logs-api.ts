import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { apiSensorLogsPageSchema, sensorStatusCountsSchema } from '@/types/water-sensor-log';

export const waterSensorLogsApi = {
  list: (query: URLSearchParams) => bff.get(`/water-sensors/logs?${query}`, apiSensorLogsPageSchema),
  statusCounts: (query: URLSearchParams) => bff.get(`/water-sensors/logs/status-counts?${query}`, sensorStatusCountsSchema),
};
