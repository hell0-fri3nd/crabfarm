import { Card } from '@/components/ui/card';

import type { SummaryStat } from '../types/dashboard';

type CustomSummaryStatsProps = {
  stats: SummaryStat[];
};

const CustomSummaryStats = ({ stats }: CustomSummaryStatsProps) => (
  <Card className="gap-0 overflow-hidden py-0">
    <dl className="grid grid-cols-2 divide-border md:grid-cols-4 md:divide-x [&>div:nth-child(-n+2)]:border-b md:[&>div:nth-child(-n+2)]:border-b-0 [&>div:nth-child(odd)]:border-r md:[&>div:nth-child(odd)]:border-r-0">
      {stats.map(({ id, label, value, unit }) => (
        <div key={id} className="flex flex-col gap-1 border-border px-4 py-4 sm:px-6 sm:py-5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</span>
            {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  </Card>
);

export default CustomSummaryStats;
