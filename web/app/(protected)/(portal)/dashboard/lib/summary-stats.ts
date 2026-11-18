import { sensorKindSchema } from '@/types/sensor';

import type { StreamStatus } from '@/events/use-event-stream';
import type { DeviceAlert, DeviceConnection } from '@/types/device';

import type { DashboardSummary, SummaryStat } from '../types/dashboard';

type NextFeed = NonNullable<DashboardSummary['next_feed']>;

type WaterHealth = {
  status: StreamStatus;
  connection: DeviceConnection;
  alerts: Pick<DeviceAlert, 'status'>[];
};

const SENSOR_COUNT = sensorKindSchema.options.length;

const toWaterStat = ({ status, connection, alerts }: WaterHealth): SummaryStat => {
  const stat = { id: 'water-in-range', label: 'Water in range' };
  if (status === 'closed' || connection === 'disconnected') return { ...stat, value: 'No reading', unit: null };
  if (status !== 'open' || connection === 'checking') return { ...stat, value: 'Checking', unit: null };

  const hasDanger = alerts.some((alert) => alert.status === 'danger');
  return {
    ...stat,
    value: String(SENSOR_COUNT - alerts.length),
    unit: `of ${SENSOR_COUNT} sensors`,
    ...(alerts.length > 0 && { tone: hasDanger ? 'danger' : 'warning' }),
  };
};

const toDayNote = (dayOffset: number) => {
  if (dayOffset === 0) return '';
  return dayOffset === 1 ? ' tomorrow' : ` in ${dayOffset} days`;
};

const toNextFeedStat = (nextFeed: NextFeed | null): Pick<SummaryStat, 'value' | 'unit'> => {
  if (!nextFeed) return { value: 'None', unit: 'scheduled' };

  const [hours = 0, minutes = 0] = nextFeed.feed_time.split(':').map(Number);
  return {
    value: `${hours % 12 || 12}:${String(minutes).padStart(2, '0')}`,
    unit: `${hours < 12 ? 'AM' : 'PM'}${toDayNote(nextFeed.day_offset)}`,
  };
};

export const toSummaryStats = (
  { crabs_logged_today, crabs_total, next_feed }: DashboardSummary,
  water: WaterHealth,
): SummaryStat[] => [
  toWaterStat(water),
  { id: 'crabs-logged', label: 'Crabs logged today', value: String(crabs_logged_today), unit: `of ${crabs_total}` },
  { id: 'next-feed', label: 'Next feed', ...toNextFeedStat(next_feed) },
];
