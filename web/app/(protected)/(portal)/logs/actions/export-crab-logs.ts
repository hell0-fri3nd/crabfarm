'use server';

import type { ActionResult } from '@/types/api';

import { loadAllCrabLogs, loadLogContext } from '../lib/load-crab-logs';
import { logsSearchParamsSchema } from '../types/logs';

import type { CrabLog } from '../types/logs';

export const exportCrabLogs = async (
  filters: Record<string, string>,
): Promise<ActionResult<{ rows: CrabLog[]; total: number }>> => {
  const params = logsSearchParamsSchema.parse(filters);

  const loaded = await loadLogContext();
  if (!loaded.ok) return { ok: false, message: loaded.message, errors: [] };

  const result = await loadAllCrabLogs(params, loaded.context, new Date());
  if (!result.ok) return { ok: false, message: result.message, errors: [] };

  return { ok: true, message: 'Crab logs exported', data: { rows: result.rows, total: result.total } };
};
