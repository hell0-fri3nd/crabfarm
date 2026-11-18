'use client';

import { CartesianGrid, Line, LineChart, ReferenceArea, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

import type { ChartConfig } from '@/components/ui/chart';

import type { ChartPoint } from '../types/logs';

type Measure = 'weight_g' | 'width_mm';

type CustomMeasureChartProps = {
  points: ChartPoint[];
  measure: Measure;
  crabName: string | null;
};

type DayValue = { label: string; value: number };

const MEASURES = {
  weight_g: { title: 'Weight', unit: 'g', actual: 'actual_weight_g', forecast: 'forecast_weight_g' },
  width_mm: { title: 'Width', unit: 'mm', actual: 'actual_width_mm', forecast: 'forecast_width_mm' },
} as const;

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const CHANGE_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, signDisplay: 'always' });

// Pad the scale so a small wobble between points doesn't read as a big swing
const PADDED_DOMAIN: [(min: number) => number, (max: number) => number] = [
  (min) => Math.max(Math.floor(min * 0.9), 0),
  (max) => Math.ceil(max * 1.1),
];

const toDayValue = (point: ChartPoint | undefined, key: keyof ChartPoint): DayValue | null => {
  const value = point?.[key];
  return point && typeof value === 'number' ? { label: point.label, value } : null;
};

const toSummary = (actual: DayValue | null, forecast: DayValue | null, unit: string) => {
  const format = (value: number) => `${NUMBER_FORMAT.format(value)} ${unit}`;
  const latest = actual ? `Latest ${format(actual.value)} on ${actual.label}.` : 'No logs in these dates.';
  if (!forecast) return `${latest} No forecast yet.`;

  const change = actual ? ` (${CHANGE_FORMAT.format(forecast.value - actual.value)} ${unit})` : '';
  return `${latest} Forecast ${format(forecast.value)} by ${forecast.label}${change}.`;
};

const CustomMeasureChart = ({ points, measure, crabName }: CustomMeasureChartProps) => {
  const { title, unit, actual: actualKey, forecast: forecastKey } = MEASURES[measure];
  const config = {
    [actualKey]: { label: 'Actual', color: 'var(--primary)' },
    [forecastKey]: { label: 'Forecast', color: 'var(--muted-foreground)' },
  } satisfies ChartConfig;

  const lastActualIndex = points.findLastIndex((point) => point[actualKey] !== null);
  const actual = toDayValue(points[lastActualIndex], actualKey);
  const forecast = toDayValue(points.findLast((point) => point[forecastKey] !== null), forecastKey);
  const firstDayAhead = points[lastActualIndex + 1];
  const lastDay = points.at(-1);
  const hasData = actual !== null || forecast !== null;

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <span className="text-sm font-semibold">
          {title} ({unit})
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          {hasData ? toSummary(actual, forecast, unit) : `No ${title.toLowerCase()} to plot yet`}
        </span>
      </figcaption>

      {hasData ? (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={48} domain={PADDED_DOMAIN} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            {firstDayAhead && lastDay && (
              <ReferenceArea
                x1={firstDayAhead.label}
                x2={lastDay.label}
                fill="var(--muted-foreground)"
                fillOpacity={0.08}
                strokeOpacity={0}
              />
            )}
            <Line
              dataKey={forecastKey}
              type="linear"
              stroke={`var(--color-${forecastKey})`}
              strokeWidth={2}
              strokeDasharray="6 5"
              dot={{ r: 4, fill: 'var(--card)', stroke: `var(--color-${forecastKey})`, strokeWidth: 2, strokeDasharray: '0' }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey={actualKey}
              type="linear"
              stroke={`var(--color-${actualKey})`}
              strokeWidth={2}
              dot={{ r: 4, fill: `var(--color-${actualKey})`, stroke: 'var(--card)', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
          {crabName
            ? `${crabName} has no ${title.toLowerCase()} in these dates. Try a wider range.`
            : 'No crab logs match these filters.'}
        </div>
      )}
    </figure>
  );
};

export default CustomMeasureChart;
