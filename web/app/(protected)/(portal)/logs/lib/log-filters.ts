import { endOfDay, format, isSameDay, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';

import type { CrabLog, DatePreset, LevelFilter, LogsSearchParams, SensorLog } from '../types/logs';

export const PAGE_SIZE = 7;

export const DATE_PRESET_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
} as const satisfies Record<DatePreset, string>;

const DATE_PRESET_DAYS = { today: 0, '7d': 6, '30d': 29 } as const satisfies Record<DatePreset, number>;

export const LEVEL_FILTER_LABELS = {
  all: 'All levels',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  normal: 'In range',
} as const satisfies Record<LevelFilter, string>;

export type DateRangeWindow = {
  from: Date;
  to: Date;
  label: string;
  isCustom: boolean;
};

export const toDateParam = (date: Date) => format(date, 'yyyy-MM-dd');

export const resolveDateRange = ({ preset, from, to }: LogsSearchParams, now: Date): DateRangeWindow => {
  if (from && to) {
    const start = startOfDay(parseISO(from));
    const end = endOfDay(parseISO(to));
    return { from: start, to: end, label: `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`, isCustom: true };
  }

  return {
    from: startOfDay(subDays(now, DATE_PRESET_DAYS[preset])),
    to: endOfDay(now),
    label: DATE_PRESET_LABELS[preset],
    isCustom: false,
  };
};

const isInWindow = (iso: string, { from, to }: DateRangeWindow) => isWithinInterval(parseISO(iso), { start: from, end: to });

const matchesQuery = (query: string, ...fields: string[]) => {
  const needle = query.toLowerCase().replace(/\s+/g, '');
  return needle === '' || fields.some((field) => field.toLowerCase().replace(/\s+/g, '').includes(needle));
};

export const filterCrabLogs = (logs: CrabLog[], params: LogsSearchParams, dateRange: DateRangeWindow) =>
  logs.filter(
    (log) =>
      isInWindow(log.logged_at, dateRange) &&
      (params.batch === 'all' || log.batch_code === params.batch) &&
      matchesQuery(params.q, log.crab_code, log.logged_by, log.batch_code),
  );

const matchesLevel = (level: LevelFilter, { severity }: SensorLog) => {
  if (level === 'all') return true;
  if (level === 'normal') return severity === null;
  return severity === level;
};

export const filterSensorLogs = (logs: SensorLog[], params: LogsSearchParams, dateRange: DateRangeWindow) =>
  logs.filter(
    (log) => isInWindow(log.measured_at, dateRange) && matchesLevel(params.level, log) && matchesQuery(params.q, log.sensor_label),
  );

export type PageSlice<T> = {
  rows: T[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
};

export const paginate = <T>(rows: T[], requestedPage: number): PageSlice<T> => {
  const pageCount = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const page = Math.min(requestedPage, pageCount);
  const startIndex = (page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(startIndex, startIndex + PAGE_SIZE);

  return {
    rows: pageRows,
    page,
    pageCount,
    start: pageRows.length > 0 ? startIndex + 1 : 0,
    end: startIndex + pageRows.length,
    total: rows.length,
  };
};

export const formatLogTime = (iso: string, now: Date) => {
  const date = parseISO(iso);
  const time = format(date, 'h:mm a');
  if (isSameDay(date, now)) return `Today, ${time}`;
  if (isSameDay(date, subDays(now, 1))) return `Yesterday, ${time}`;
  return `${format(date, 'EEE d MMM')}, ${time}`;
};

export const formatSignedPercent = (value: number) => {
  const magnitude = `${Math.abs(value).toFixed(1)}%`;
  if (value > 0) return `+${magnitude}`;
  if (value < 0) return `−${magnitude}`;
  return magnitude;
};

export const formatReading = ({ value, decimals, unit }: SensorLog) =>
  unit ? `${value.toFixed(decimals)} ${unit}` : value.toFixed(decimals);

const escapeCsvCell = (cell: string | number) => {
  const text = String(cell);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (headers: string[], rows: (string | number)[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');

export const crabLogsToCsv = (logs: CrabLog[]) =>
  toCsv(
    ['crab', 'batch', 'weight_g', 'width_cm', 'vs_predicted_pct', 'flag', 'logged_by', 'logged_at'],
    logs.map((log) => [
      log.crab_code,
      log.batch_code,
      log.weight_g,
      log.width_cm,
      log.vs_predicted_pct,
      log.flag ?? '',
      log.logged_by,
      log.logged_at,
    ]),
  );

export const sensorLogsToCsv = (logs: SensorLog[]) =>
  toCsv(
    ['sensor', 'value', 'unit', 'safe_range', 'severity', 'measured_at'],
    logs.map((log) => [log.sensor_label, log.value, log.unit, log.safe_label, log.severity ?? 'in range', log.measured_at]),
  );

export const countFlaggedSince = (logs: CrabLog[], since: Date) =>
  logs.filter(({ flag, logged_at }) => flag !== null && parseISO(logged_at) >= since).length;

export const countOutOfRangeSince = (logs: SensorLog[], since: Date) =>
  logs.filter(({ severity, measured_at }) => severity === 'high' && parseISO(measured_at) >= since).length;
