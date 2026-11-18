import 'server-only';

import { batchesApi } from '@/api/batches-api';
import { crabLogsApi } from '@/api/crab-logs-api';
import { toFarmDayKey, toFarmDayStart, toFarmShortDate } from '@/lib/format';

import type { GrowthData, GrowthDay, GrowthRange } from '../types/dashboard';

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS_IN_YEAR = 12;
const RANGE_DAYS = { '7d': 7, '30d': 30 } as const;

const monthLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', year: '2-digit' });

const toDayBuckets = (now: Date, count: number): GrowthDay[] =>
  Array.from({ length: count }, (_, index) => {
    const at = new Date(now.getTime() - (count - 1 - index) * DAY_MS).toISOString();
    return { key: toFarmDayKey(at), label: toFarmShortDate(at) };
  });

const toMonthBuckets = (now: Date): GrowthDay[] => {
  const [year = 0, month = 1] = toFarmDayKey(now.toISOString()).split('-').map(Number);
  return Array.from({ length: MONTHS_IN_YEAR }, (_, index) => {
    const at = new Date(Date.UTC(year, month - MONTHS_IN_YEAR + index, 1));
    return { key: at.toISOString().slice(0, 7), label: monthLabel.format(at) };
  });
};

const toRangeStart = (now: Date, range: GrowthRange, days: GrowthDay[]) =>
  range === '12m'
    ? `${days[0]?.key ?? toFarmDayKey(now.toISOString()).slice(0, 7)}-01T00:00:00+08:00`
    : toFarmDayStart(new Date(now.getTime() - (RANGE_DAYS[range] - 1) * DAY_MS));

export const loadGrowth = async (
  now: Date,
  range: GrowthRange,
): Promise<{ ok: true; data: GrowthData } | { ok: false; message: string }> => {
  const days = range === '12m' ? toMonthBuckets(now) : toDayBuckets(now, RANGE_DAYS[range]);
  const [summary, batches] = await Promise.all([
    crabLogsApi.dailySummary(new URLSearchParams({ from: toRangeStart(now, range, days) })),
    batchesApi.list(),
  ]);
  if (!summary.ok) return { ok: false, message: summary.message };

  return {
    ok: true,
    data: {
      range,
      days,
      logs: summary.data.map(({ day, batch_id, log_type, weight_g_avg, weight_g_count, width_mm_avg, width_mm_count }) => ({
        batch_id,
        log_type,
        weight_avg: weight_g_avg,
        weight_count: weight_g_count,
        width_avg: width_mm_avg,
        width_count: width_mm_count,
        day_key: range === '12m' ? day.slice(0, 7) : day,
      })),
      batches: (batches.ok ? batches.data : []).map(({ id }) => id).toSorted((left, right) => right - left),
    },
  };
};
