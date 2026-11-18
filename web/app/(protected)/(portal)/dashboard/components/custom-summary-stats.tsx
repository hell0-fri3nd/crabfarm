'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useDeviceStatusStore } from '@/stores/device-status-store';

import { useDashboardSummaryStream } from '../events/use-dashboard-summary-stream';
import { toSummaryStats } from '../lib/summary-stats';

import type { DashboardSummary, SummaryStat } from '../types/dashboard';

type CustomSummaryStatsProps = {
  initialSummary: DashboardSummary;
};

const TONE_CLASS = {
  warning: 'text-warning',
  danger: 'text-destructive',
} as const satisfies Record<NonNullable<SummaryStat['tone']>, string>;

const CustomSummaryStats = ({ initialSummary }: CustomSummaryStatsProps) => {
  const summary = useDashboardSummaryStream(initialSummary);
  const status = useDeviceStatusStore((state) => state.status);
  const connection = useDeviceStatusStore((state) => state.connections.water_sensors);
  const alerts = useDeviceStatusStore((state) => state.waterAlerts);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {toSummaryStats(summary, { status, connection, alerts }).map(({ id, label, value, unit, tone }) => (
          <div key={id} className="flex flex-col gap-1 border-border px-4 py-4 sm:px-6 sm:py-5">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="flex items-baseline gap-1.5">
              <span className={cn('text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl', tone && TONE_CLASS[tone])}>
                {value}
              </span>
              {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

export default CustomSummaryStats;
