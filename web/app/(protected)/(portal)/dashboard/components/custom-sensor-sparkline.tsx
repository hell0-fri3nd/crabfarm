'use client';

import { Line, LineChart, ReferenceArea, ReferenceDot, XAxis, YAxis } from 'recharts';

import CustomSeverityBadge from '@/components/custom/custom-severity-badge';
import { Card } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';

import { formatReading } from '../lib/sensor-meta';

import type { ChartConfig } from '@/components/ui/chart';

import type { SensorSeries } from '../types/dashboard';

type CustomSensorSparklineProps = {
  series: SensorSeries;
  startLabel: string;
};

const CustomSensorSparkline = ({ series, startLabel }: CustomSensorSparklineProps) => {
  const { label, unit, decimals, severity, points, domain_min, domain_max, safe_min, safe_max } = series;
  const values = points.map(({ value }) => value);
  const last = points.at(-1);
  const isHigh = severity === 'high';
  const config = { value: { label, color: 'var(--foreground)' } } satisfies ChartConfig;
  const unitSuffix = unit ? ` ${unit}` : '';
  const rangeLabel = `${formatReading(Math.min(...values), decimals)}–${formatReading(Math.max(...values), decimals)}${unitSuffix}`;
  const nowLabel = last ? `now ${formatReading(last.value, decimals)}${unitSuffix}` : 'no reading';

  return (
    <Card className={cn('gap-3 rounded-xl p-4 shadow-none sm:p-5', isHigh && 'border-destructive/60')}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        {isHigh ? (
          <CustomSeverityBadge level="high" />
        ) : (
          <span className="text-xs text-muted-foreground tabular-nums">{rangeLabel}</span>
        )}
      </div>

      <ChartContainer config={config} className="aspect-auto h-16 w-full" aria-hidden>
        <LineChart data={points} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <XAxis dataKey="at" hide />
          <YAxis hide domain={[domain_min, domain_max]} />
          <ReferenceArea
            y1={safe_min ?? domain_min}
            y2={safe_max ?? domain_max}
            fill="var(--primary)"
            fillOpacity={0.14}
            stroke="none"
            ifOverflow="hidden"
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeOpacity={0.75}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {last && (
            <ReferenceDot
              x={last.at}
              y={last.value}
              r={3.5}
              fill={isHigh ? 'var(--destructive)' : 'var(--primary)'}
              stroke="none"
            />
          )}
        </LineChart>
      </ChartContainer>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground tabular-nums">
        <span>{startLabel}</span>
        <span>{nowLabel}</span>
      </div>
    </Card>
  );
};

export default CustomSensorSparkline;
