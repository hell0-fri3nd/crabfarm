import 'server-only';

import { crabLogsApi } from '@/api/crab-logs-api';
import { crabsApi } from '@/api/crabs-api';
import { teamApi } from '@/api/team-api';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import type { ApiResult } from '@/types/api';

import { toChartPoints } from './chart-points';
import {
  EMPTY_CRAB_LOG_PAGE,
  toChartCrabs,
  toCrabLog,
  toCrabLogPage,
  toLogsQuery,
  toNamedCrab,
  toPageCount,
  withCrabName,
  withoutCrabName,
} from './crab-log-query';

import type { LogContext } from './crab-log-query';
import type { CrabLog, CrabLogChart, CrabLogPage, LogsSearchParams } from '../types/logs';

const EXPORT_PAGE_SIZE = 100;
const MAX_EXPORT_PAGES = 50;

const failed = (result: ApiResult<unknown>) => ({ ok: false as const, message: result.ok ? '' : result.message });

export const loadLogContext = async (): Promise<{ ok: true; context: LogContext } | { ok: false; message: string }> => {
  const [crabs, self] = await Promise.all([crabsApi.list(), getCurrentUser()]);
  if (!crabs.ok) return failed(crabs);

  // STAFF can't list users, so their teammates show as "Teammate"
  const team = can(self.role, 'users.manage') ? await teamApi.list() : null;
  const names = new Map(team?.ok ? team.data.items.map(({ id, name }) => [id, name]) : []);

  return { ok: true, context: { crabs: crabs.data, names, selfId: self.id } };
};

export const loadCrabLogPage = async (
  params: LogsSearchParams,
  context: LogContext,
  now: Date,
): Promise<{ ok: true; page: CrabLogPage } | { ok: false; message: string }> => {
  const query = toLogsQuery(params, context.crabs, now, params.page);
  if (!query) return { ok: true, page: EMPTY_CRAB_LOG_PAGE };

  const result = await crabLogsApi.list(query);
  if (!result.ok) return failed(result);

  const lastPage = toPageCount(result.data.total);
  if (params.page <= lastPage || result.data.total === 0) return { ok: true, page: toCrabLogPage(result.data, context) };

  const lastQuery = toLogsQuery({ ...params, page: lastPage }, context.crabs, now, lastPage);
  const last = lastQuery ? await crabLogsApi.list(lastQuery) : result;
  return last.ok ? { ok: true, page: toCrabLogPage(last.data, context) } : failed(last);
};

export const loadAllCrabLogs = async (
  params: LogsSearchParams,
  context: LogContext,
  now: Date,
  maxPages = MAX_EXPORT_PAGES,
): Promise<{ ok: true; rows: CrabLog[]; total: number } | { ok: false; message: string }> => {
  const rows: CrabLog[] = [];
  let total = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const query = toLogsQuery(params, context.crabs, now, page, EXPORT_PAGE_SIZE);
    if (!query) break;

    const result = await crabLogsApi.list(query);
    if (!result.ok) return failed(result);

    total = result.data.total;
    rows.push(...result.data.items.map((log) => toCrabLog(log, context)));
    if (rows.length >= total || result.data.items.length === 0) break;
  }

  return { ok: true, rows, total };
};

// One crab logs about once a day, so its newest 500 logs cover more than a year
const MAX_CHART_PAGES = 5;

export const loadCrabLogChart = async (
  params: LogsSearchParams,
  context: LogContext,
  now: Date,
): Promise<{ ok: true; chart: CrabLogChart } | { ok: false; message: string }> => {
  const filters: LogsSearchParams = { ...params, type: 'all' };
  const emptyChart: CrabLogChart = {
    crab_name: null,
    crab_code: null,
    crab_names: [],
    points: [],
    plotted: 0,
    crab_total: 0,
    total: 0,
  };

  const matchingQuery = toLogsQuery(filters, context.crabs, now, 1, 1);
  const newestActualQuery = toLogsQuery({ ...filters, type: 'actual' }, context.crabs, now, 1, 1);
  // The picker ignores the crab in the search box, so another crab can still be chosen
  const availableQuery = toLogsQuery({ ...filters, q: withoutCrabName(params.q) }, context.crabs, now, 1, 1);
  if (!matchingQuery || !newestActualQuery || !availableQuery) return { ok: true, chart: emptyChart };

  const [matching, newestActual, loggedCrabIds] = await Promise.all([
    crabLogsApi.list(matchingQuery),
    crabLogsApi.list(newestActualQuery),
    crabLogsApi.listCrabIds(availableQuery),
  ]);
  if (!matching.ok) return failed(matching);
  if (!newestActual.ok) return failed(newestActual);
  if (!loggedCrabIds.ok) return failed(loggedCrabIds);

  const availableCrabs = toChartCrabs(context.crabs, loggedCrabIds.data);
  const namedCrab = toNamedCrab(params.q, context.crabs);
  // Without a crab in the search box, open on the crab someone measured most recently
  const newestCrab = availableCrabs.find(({ id }) => id === newestActual.data.items[0]?.crab_id);
  const crab = namedCrab ?? newestCrab ?? availableCrabs[0];
  const availableNames = availableCrabs.map(({ name }) => name);
  if (!crab) return { ok: true, chart: { ...emptyChart, crab_names: availableNames, total: matching.data.total } };

  // A crab typed in the search box stays selectable so the picker can show it, even with no logs here
  const crab_names = availableNames.includes(crab.name) ? availableNames : [crab.name, ...availableNames];

  const result = await loadAllCrabLogs({ ...filters, q: withCrabName(params.q, crab.name) }, context, now, MAX_CHART_PAGES);
  if (!result.ok) return result;

  return {
    ok: true,
    chart: {
      crab_name: crab.name,
      crab_code: result.rows[0]?.crab_code ?? crab.name,
      crab_names,
      points: toChartPoints(result.rows),
      plotted: result.rows.length,
      crab_total: result.total,
      total: matching.data.total,
    },
  };
};
