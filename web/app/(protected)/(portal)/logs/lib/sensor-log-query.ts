import { WATER_SENSOR_DISPLAY } from '@/lib/water-sensors';

import { toDateWindow, toPageCount } from './crab-log-query';
import { PAGE_SIZE } from './log-filters';

import type { WaterSensorInfo } from '@/lib/water-sensors';

import type { ApiSensorLog, ApiSensorLogsPage, LogsSearchParams, SensorLog, SensorLogPage, SensorStatusCounts } from '../types/logs';

export const EMPTY_SENSOR_LOG_PAGE: SensorLogPage = { rows: [], page: 1, pageCount: 1, start: 0, end: 0, total: 0 };

export const EMPTY_SENSOR_COUNTS: SensorStatusCounts = { normal: 0, warning: 0, danger: 0 };

const toCompact = (text: string) => text.toLowerCase().replace(/\s+/g, '');

// null means no sensor is named like the search text, so nothing can match
export const toSensorCountsQuery = (params: LogsSearchParams, now: Date) => {
  const needle = toCompact(params.q);
  const sensors = WATER_SENSOR_DISPLAY.filter(({ label }) => toCompact(label).includes(needle));
  if (sensors.length === 0) return null;

  const query = new URLSearchParams(toDateWindow(params, now));
  if (needle !== '') sensors.forEach(({ kind }) => query.append('sensor', kind));
  return query;
};

export const toSensorLogsQuery = (params: LogsSearchParams, now: Date, page: number, size = PAGE_SIZE) => {
  const query = toSensorCountsQuery(params, now);
  if (!query) return null;

  query.set('page', String(page));
  query.set('size', String(size));
  query.set('sort', '-measured_at');
  if (params.level !== 'all') query.set('status', params.level);
  return query;
};

export const toSensorLog = ({ id, sensor, value, status, measured_at }: ApiSensorLog, sensors: WaterSensorInfo[]): SensorLog => {
  const info = sensors.find(({ kind }) => kind === sensor);
  return {
    id: `sensor-log-${id}`,
    sensor,
    sensor_label: info?.label ?? sensor,
    value,
    unit: info?.unit ?? '',
    decimals: info?.decimals ?? 2,
    normal_range: info?.normal_range ?? 'not set',
    status,
    measured_at,
  };
};

export const toSensorLogPage = ({ items, total, page, size }: ApiSensorLogsPage, sensors: WaterSensorInfo[]): SensorLogPage => {
  const startIndex = (page - 1) * size;
  return {
    rows: items.map((log) => toSensorLog(log, sensors)),
    page,
    pageCount: toPageCount(total, size),
    start: items.length > 0 ? startIndex + 1 : 0,
    end: startIndex + items.length,
    total,
  };
};
