import { endOfDay, format, isSameDay, isWithinInterval, parseISO, startOfDay, subDays } from 'date-fns';

import type { CrabLog, DatePreset, LevelFilter, LogType, LogTypeFilter, LogsSearchParams, SensorLog } from '../types/logs';

export const PAGE_SIZE = 7;

export const LOG_TYPE_LABELS = { actual: 'Actual', prediction: 'Forecast' } as const satisfies Record<LogType, string>;

export const LOG_TYPE_FILTER_LABELS = { all: 'All types', ...LOG_TYPE_LABELS } as const satisfies Record<LogTypeFilter, string>;

export const DATE_PRESET_LABELS = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '12m': 'Last 12 months',
} as const satisfies Record<DatePreset, string>;

const DATE_PRESET_DAYS = { today: 0, '7d': 6, '30d': 29, '12m': 364 } as const satisfies Record<DatePreset, number>;

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

export const formatReading = ({ value, decimals, unit }: SensorLog) =>
  unit ? `${value.toFixed(decimals)} ${unit}` : value.toFixed(decimals);

const escapeCsvCell = (cell: string | number) => {
  const text = String(cell);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (headers: string[], rows: (string | number)[][]) =>
  [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n');

const toCsvNumber = (value: number | null) => value ?? '';

export const crabLogsToCsv = (logs: CrabLog[]) =>
  toCsv(
    ['crab', 'batch', 'log_type', 'width_mm', 'weight_g', 'logged_by', 'created_at'],
    logs.map((log) => [
      log.crab_code,
      log.batch_label,
      log.log_type,
      toCsvNumber(log.width_mm),
      toCsvNumber(log.weight_g),
      log.logged_by,
      log.logged_at,
    ]),
  );

export const sensorLogsToCsv = (logs: SensorLog[]) =>
  toCsv(
    ['sensor', 'value', 'unit', 'safe_range', 'severity', 'measured_at'],
    logs.map((log) => [log.sensor_label, log.value, log.unit, log.safe_label, log.severity ?? 'in range', log.measured_at]),
  );

export const countOutOfRangeSince = (logs: SensorLog[], since: Date) =>
  logs.filter(({ severity, measured_at }) => severity === 'high' && parseISO(measured_at) >= since).length;
