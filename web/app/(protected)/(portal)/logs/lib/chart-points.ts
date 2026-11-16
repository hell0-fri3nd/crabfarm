import { FARM_TIME_ZONE } from '@/lib/format';

import type { ChartBucket, ChartPoint, CrabLog, LogType } from '../types/logs';

const BUCKETS: ChartBucket[] = ['day', 'hour', 'minute', 'second'];

const keyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: FARM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const KEY_LENGTH = { day: 10, hour: 13, minute: 16, second: 19 } as const satisfies Record<ChartBucket, number>;

const toKey = (iso: string, bucket: ChartBucket) => {
  const parts = Object.fromEntries(keyFormat.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  const full = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
  return full.slice(0, KEY_LENGTH[bucket]);
};

const LABEL_FORMATS = {
  day: new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, month: 'short', day: 'numeric' }),
  hour: new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, hour: 'numeric' }),
  minute: new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, hour: 'numeric', minute: '2-digit' }),
  second: new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, hour: 'numeric', minute: '2-digit', second: '2-digit' }),
} as const satisfies Record<ChartBucket, Intl.DateTimeFormat>;

const dayLabel = LABEL_FORMATS.day;

const average = (values: number[]) =>
  values.length === 0 ? null : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;

const measuresOf = (logs: CrabLog[], type: LogType, key: 'weight_g' | 'width_mm') =>
  logs.flatMap((log) => (log.log_type === type && log[key] !== null ? [log[key]] : []));

export const toChartPoints = (logs: CrabLog[]): { bucket: ChartBucket; points: ChartPoint[] } => {
  const distinctCount = (step: ChartBucket) => new Set(logs.map(({ logged_at }) => toKey(logged_at, step))).size;
  // Coarsest step that still gives two points: logs on several days plot per day, one busy day per hour, and so on
  const bucket = BUCKETS.find((step) => distinctCount(step) >= 2) ?? 'day';
  const spansDays = distinctCount('day') > 1;

  const points = Object.entries(Object.groupBy(logs, ({ logged_at }) => toKey(logged_at, bucket)))
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([key, bucketLogs = []]) => {
      const at = new Date(bucketLogs[0]?.logged_at ?? Date.now());
      const time = LABEL_FORMATS[bucket].format(at);
      return {
        bucket_key: key,
        label: bucket !== 'day' && spansDays ? `${dayLabel.format(at)}, ${time}` : time,
        actual_weight_g: average(measuresOf(bucketLogs, 'actual', 'weight_g')),
        predicted_weight_g: average(measuresOf(bucketLogs, 'prediction', 'weight_g')),
        actual_width_mm: average(measuresOf(bucketLogs, 'actual', 'width_mm')),
        predicted_width_mm: average(measuresOf(bucketLogs, 'prediction', 'width_mm')),
      };
    });

  return { bucket, points };
};
