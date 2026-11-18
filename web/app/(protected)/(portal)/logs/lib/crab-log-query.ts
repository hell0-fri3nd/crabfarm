import { toFarmDayStart } from '@/lib/format';

import type { Crab } from '@/types/crab-management';

import { PAGE_SIZE } from './log-filters';

import type { ApiLog, CrabLog, CrabLogPage, LogsPage, LogsSearchParams } from '../types/logs';

const DAY_MS = 24 * 60 * 60 * 1000;
const PRESET_DAYS = { today: 0, '7d': 6, '30d': 29, '12m': 364 } as const;

const BATCH_AND_CRAB = /^B(\d{1,9})(?:-?([A-Z])-?(\d{1,3}))?$/;
const CRAB_ONLY = /^([A-Z])-?(\d{1,3})$/;

type CrabCodeFilter = { batch_id?: number; crab_name?: string };

const parseCrabCode = (query: string): CrabCodeFilter | null => {
  const code = query.replace(/\s+/g, '').toUpperCase();
  if (code === '') return {};

  const [, batch, group, number] = BATCH_AND_CRAB.exec(code) ?? [];
  if (batch) return { batch_id: Number(batch), crab_name: group && number ? `${group}${Number(number)}` : undefined };

  const [, crabGroup, crabNumber] = CRAB_ONLY.exec(code) ?? [];
  return crabGroup && crabNumber ? { crab_name: `${crabGroup}${Number(crabNumber)}` } : null;
};

export const toNamedCrab = (query: string, crabs: Crab[]) => {
  const name = parseCrabCode(query)?.crab_name;
  return name === undefined ? undefined : crabs.find((crab) => crab.name === name);
};

export const toChartCrabs = (crabs: Crab[], loggedCrabIds: number[]) =>
  crabs
    .filter(({ id, name }) => loggedCrabIds.includes(id) && parseCrabCode(name)?.crab_name === name)
    .toSorted((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }));

export const withoutCrabName = (query: string) => {
  const code = parseCrabCode(query);
  if (!code) return query;
  return code.batch_id === undefined ? '' : `B${code.batch_id}`;
};

// Picking a crab keeps a batch typed in the search box, so the chart stays inside that batch
export const withCrabName = (query: string, crabName: string) => {
  const batchId = parseCrabCode(query)?.batch_id;
  return batchId === undefined ? crabName : `B${batchId}-${crabName}`;
};

const farmDay = (date: string) => new Date(`${date}T12:00:00+08:00`);

const toDateWindow = ({ preset, from, to }: LogsSearchParams, now: Date): Record<string, string> =>
  from && to
    ? { from: toFarmDayStart(farmDay(from)), to: toFarmDayStart(new Date(farmDay(to).getTime() + DAY_MS)) }
    : { from: toFarmDayStart(new Date(now.getTime() - PRESET_DAYS[preset] * DAY_MS)) };

// null means the filters can never match (unknown crab, or a code for another batch than the one picked)
export const toLogsQuery = (params: LogsSearchParams, crabs: Crab[], now: Date, page: number, size = PAGE_SIZE) => {
  const code = parseCrabCode(params.q);
  if (!code) return null;

  const pickedBatch = params.batch === 'all' ? undefined : Number(params.batch);
  if (pickedBatch !== undefined && code.batch_id !== undefined && pickedBatch !== code.batch_id) return null;

  const crab = code.crab_name === undefined ? undefined : crabs.find(({ name }) => name === code.crab_name);
  if (code.crab_name !== undefined && !crab) return null;

  const batchId = pickedBatch ?? code.batch_id;
  const query = new URLSearchParams({ ...toDateWindow(params, now), page: String(page), size: String(size), sort: '-created_at' });
  if (batchId !== undefined) query.set('batch_id', String(batchId));
  if (crab) query.set('crab_id', String(crab.id));
  if (params.type !== 'all') query.set('log_type', params.type);
  return query;
};

export type LogContext = {
  crabs: Crab[];
  names: Map<string, string>;
  selfId: string;
};

const toLoggedBy = (userId: string, { names, selfId }: LogContext) =>
  userId === selfId ? 'You' : (names.get(userId) ?? 'Teammate');

export const toCrabLog = (log: ApiLog, context: LogContext): CrabLog => {
  const name = context.crabs.find(({ id }) => id === log.crab_id)?.name ?? `#${log.crab_id}`;
  return {
    id: `crab-log-${log.id}`,
    crab_code: log.batch_id === null ? name : `B${log.batch_id}-${name}`,
    batch_label: log.batch_id === null ? '—' : `Batch ${log.batch_id}`,
    log_type: log.log_type,
    width_mm: log.width_mm,
    weight_g: log.weight_g,
    logged_by: toLoggedBy(log.user_id, context),
    logged_at: log.created_at,
  };
};

export const toPageCount = (total: number, size = PAGE_SIZE) => Math.max(Math.ceil(total / size), 1);

export const EMPTY_CRAB_LOG_PAGE: CrabLogPage = { rows: [], page: 1, pageCount: 1, start: 0, end: 0, total: 0 };

export const toCrabLogPage = ({ items, total, page, size }: LogsPage, context: LogContext): CrabLogPage => {
  const startIndex = (page - 1) * size;
  return {
    rows: items.map((log) => toCrabLog(log, context)),
    page,
    pageCount: toPageCount(total, size),
    start: items.length > 0 ? startIndex + 1 : 0,
    end: startIndex + items.length,
    total,
  };
};
