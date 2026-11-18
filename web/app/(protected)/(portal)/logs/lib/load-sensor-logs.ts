import 'server-only';

import { waterSensorLogsApi } from '@/api/water-sensor-logs-api';
import { waterSensorThresholdsApi } from '@/api/water-sensor-thresholds-api';
import { toWaterSensorInfos } from '@/lib/water-sensors';

import { toPageCount } from './crab-log-query';
import {
  EMPTY_SENSOR_COUNTS,
  EMPTY_SENSOR_LOG_PAGE,
  toSensorCountsQuery,
  toSensorLog,
  toSensorLogPage,
  toSensorLogsQuery,
} from './sensor-log-query';

import type { LogsSearchParams, SensorLog, SensorLogPage, SensorStatusCounts } from '../types/logs';

const EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGES = 50;

type LoadedSensorLogs = { ok: true; page: SensorLogPage; counts: SensorStatusCounts } | { ok: false; message: string };

export const loadSensorLogPage = async (params: LogsSearchParams, now: Date): Promise<LoadedSensorLogs> => {
  const query = toSensorLogsQuery(params, now, params.page);
  const countsQuery = toSensorCountsQuery(params, now);
  if (!query || !countsQuery) return { ok: true, page: EMPTY_SENSOR_LOG_PAGE, counts: EMPTY_SENSOR_COUNTS };

  const [result, counts, thresholds] = await Promise.all([
    waterSensorLogsApi.list(query),
    waterSensorLogsApi.statusCounts(countsQuery),
    waterSensorThresholdsApi.list(),
  ]);
  if (!result.ok) return { ok: false, message: result.message };
  if (!counts.ok) return { ok: false, message: counts.message };
  if (!thresholds.ok) return { ok: false, message: thresholds.message };

  const sensors = toWaterSensorInfos(thresholds.data);
  const lastPage = toPageCount(result.data.total);
  if (params.page <= lastPage || result.data.total === 0) {
    return { ok: true, page: toSensorLogPage(result.data, sensors), counts: counts.data };
  }

  const lastQuery = toSensorLogsQuery(params, now, lastPage);
  const last = lastQuery ? await waterSensorLogsApi.list(lastQuery) : result;
  return last.ok ? { ok: true, page: toSensorLogPage(last.data, sensors), counts: counts.data } : { ok: false, message: last.message };
};

export const loadAllSensorLogs = async (
  params: LogsSearchParams,
  now: Date,
): Promise<{ ok: true; rows: SensorLog[]; total: number } | { ok: false; message: string }> => {
  const thresholds = await waterSensorThresholdsApi.list();
  if (!thresholds.ok) return { ok: false, message: thresholds.message };

  const sensors = toWaterSensorInfos(thresholds.data);
  const rows: SensorLog[] = [];
  let total = 0;

  for (let page = 1; page <= MAX_EXPORT_PAGES; page += 1) {
    const query = toSensorLogsQuery(params, now, page, EXPORT_PAGE_SIZE);
    if (!query) break;

    const result = await waterSensorLogsApi.list(query);
    if (!result.ok) return { ok: false, message: result.message };

    total = result.data.total;
    rows.push(...result.data.items.map((log) => toSensorLog(log, sensors)));
    if (rows.length >= total || result.data.items.length === 0) break;
  }

  return { ok: true, rows, total };
};
