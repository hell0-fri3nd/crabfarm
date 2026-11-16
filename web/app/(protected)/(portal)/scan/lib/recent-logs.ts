import { toDayTimeLabel } from '@/lib/format';

import type { Crab } from '@/types/crab-management';

import type { Log, LogCreatedEvent, RecentLog } from '../types/scan';

export const RECENT_LOGS = 5;

const MEASUREMENT_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

const formatMeasurement = (value: number | null) => (value === null ? '—' : MEASUREMENT_FORMAT.format(value));

const toCrabCode = ({ batch_id, crab_id }: Log, crabs: Crab[]) => {
  const name = crabs.find(({ id }) => id === crab_id)?.name ?? `#${crab_id}`;
  return batch_id === null ? name : `B${batch_id}-${name}`;
};

type RecentLogContext = {
  crabs: Crab[];
  loggedAt: string;
  loggedBy: string;
};

export const toRecentLog = (log: Log, { crabs, loggedAt, loggedBy }: RecentLogContext): RecentLog => ({
  id: `log-${log.id}`,
  code: toCrabCode(log, crabs),
  weight_label: formatMeasurement(log.weight_g),
  width_label: formatMeasurement(log.width_mm),
  logged_at_label: toDayTimeLabel(loggedAt),
  logged_by: loggedBy,
});

export const fromLogCreatedEvent = (event: LogCreatedEvent, crabs: Crab[], selfId: string) =>
  toRecentLog(event.changes.after, {
    crabs,
    loggedAt: event.occurred_at,
    loggedBy: event.actor_id === selfId ? 'You' : (event.actor_email ?? 'Someone'),
  });
