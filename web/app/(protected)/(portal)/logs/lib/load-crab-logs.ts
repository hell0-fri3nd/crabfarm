import 'server-only';

import { crabsApi } from '@/api/crabs-api';
import { teamApi } from '@/api/team-api';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import type { ApiResult } from '@/types/api';

import { EMPTY_CRAB_LOG_PAGE, toCrabLog, toCrabLogPage, toLogsQuery, toPageCount } from './crab-log-query';
import { logsApi } from '../api/logs-api';

import type { LogContext } from './crab-log-query';
import type { CrabLog, CrabLogPage, LogsSearchParams } from '../types/logs';

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

  const result = await logsApi.list(query);
  if (!result.ok) return failed(result);

  const lastPage = toPageCount(result.data.total);
  if (params.page <= lastPage || result.data.total === 0) return { ok: true, page: toCrabLogPage(result.data, context) };

  const lastQuery = toLogsQuery({ ...params, page: lastPage }, context.crabs, now, lastPage);
  const last = lastQuery ? await logsApi.list(lastQuery) : result;
  return last.ok ? { ok: true, page: toCrabLogPage(last.data, context) } : failed(last);
};

export const loadAllCrabLogs = async (
  params: LogsSearchParams,
  context: LogContext,
  now: Date,
): Promise<{ ok: true; rows: CrabLog[]; total: number } | { ok: false; message: string }> => {
  const rows: CrabLog[] = [];
  let total = 0;

  for (let page = 1; page <= MAX_EXPORT_PAGES; page += 1) {
    const query = toLogsQuery(params, context.crabs, now, page, EXPORT_PAGE_SIZE);
    if (!query) break;

    const result = await logsApi.list(query);
    if (!result.ok) return failed(result);

    total = result.data.total;
    rows.push(...result.data.items.map((log) => toCrabLog(log, context)));
    if (rows.length >= total || result.data.items.length === 0) break;
  }

  return { ok: true, rows, total };
};
