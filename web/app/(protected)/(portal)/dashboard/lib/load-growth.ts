import 'server-only';

import { batchesApi } from '@/api/batches-api';
import { crabLogsApi } from '@/api/crab-logs-api';
import { toFarmDayKey, toFarmDayStart, toFarmShortDate } from '@/lib/format';

import type { ApiLog } from '@/types/crab-log';

import type { GrowthData } from '../types/dashboard';

export const GROWTH_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
// Daily averages need every log in the window; 500 covers a week of hand logging many times over
const MAX_PAGES = 5;

const toDays = (now: Date) =>
  Array.from({ length: GROWTH_DAYS }, (_, index) => {
    const at = new Date(now.getTime() - (GROWTH_DAYS - 1 - index) * DAY_MS).toISOString();
    return { key: toFarmDayKey(at), label: toFarmShortDate(at) };
  });

export const loadGrowth = async (now: Date): Promise<{ ok: true; data: GrowthData } | { ok: false; message: string }> => {
  const from = toFarmDayStart(new Date(now.getTime() - (GROWTH_DAYS - 1) * DAY_MS));
  const logs: ApiLog[] = [];
  let total = 0;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await crabLogsApi.list(new URLSearchParams({ from, page: String(page), size: String(PAGE_SIZE), sort: '-created_at' }));
    if (!result.ok) return { ok: false, message: result.message };
    total = result.data.total;
    logs.push(...result.data.items);
    if (logs.length >= total || result.data.items.length === 0) break;
  }

  const batches = await batchesApi.list();

  return {
    ok: true,
    data: {
      days: toDays(now),
      logs: logs.map(({ batch_id, log_type, weight_g, width_mm, created_at }) => ({
        batch_id,
        log_type,
        weight_g,
        width_mm,
        day_key: toFarmDayKey(created_at),
      })),
      batches: (batches.ok ? batches.data : []).map(({ id }) => id).toSorted((left, right) => right - left),
      isPartial: logs.length < total,
    },
  };
};
