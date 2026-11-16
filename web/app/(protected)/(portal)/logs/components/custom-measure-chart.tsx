'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

import type { ChartConfig } from '@/components/ui/chart';

import type { ChartPoint, ChartSeries } from '../types/logs';

type Measure = 'weight_g' | 'width_mm';

type CustomMeasureChartProps = {
  points: ChartPoint[];
  measure: Measure;
  series: ChartSeries;
};

const MEASURES = {
  weight_g: { title: 'Weight', unit: 'g', actual: 'actual_weight_g', prediction: 'predicted_weight_g' },
  width_mm: { title: 'Width', unit: 'mm', actual: 'actual_width_mm', prediction: 'predicted_width_mm' },
} as const satisfies Record<Measure, { title: string; unit: string } & Record<ChartSeries, keyof ChartPoint>>;

const SERIES_LOOK = {
  actual: { label: 'Actual', color: 'var(--primary)', dash: undefined },
  prediction: { label: 'Predicted', color: 'var(--muted-foreground)', dash: '6 5' },
} as const satisfies Record<ChartSeries, { label: string; color: string; dash: string | undefined }>;

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

// Pad the scale so a small wobble between points doesn't read as a big swing
const PADDED_DOMAIN: [(min: number) => number, (max: number) => number] = [
  (min) => Math.max(Math.floor(min * 0.9), 0),
  (max) => Math.ceil(max * 1.1),
];

const CustomMeasureChart = ({ points, measure, series }: CustomMeasureChartProps) => {
  const { title, unit } = MEASURES[measure];
  const dataKey = MEASURES[measure][series];
  const look = SERIES_LOOK[series];
  const config = { [dataKey]: { label: look.label, color: look.color } } satisfies ChartConfig;

  const latest = points.findLast((point) => point[dataKey] !== null);
  const latestValue = latest?.[dataKey];

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption className="flex flex-col gap-1">
        <span className="text-sm font-semibold">
          {title} ({unit})
        </span>
        <span className="text-sm text-muted-foreground">
          {latest && typeof latestValue === 'number'
            ? `${latest.label}: ${look.label.toLowerCase()} ${NUMBER_FORMAT.format(latestValue)} ${unit}`
            : `No ${look.label.toLowerCase()} ${title.toLowerCase()} in these logs`}
        </span>
      </figcaption>

      {latest ? (
        <ChartContainer config={config} className="aspect-auto h-64 w-full">
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} accessibilityLayer>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} width={48} domain={PADDED_DOMAIN} allowDecimals={false} />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Line
              dataKey={dataKey}
              type="monotone"
              stroke={`var(--color-${dataKey})`}
              strokeWidth={2.5}
              strokeDasharray={look.dash}
              dot={{ r: 3.5, fill: `var(--color-${dataKey})`, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
          {series === 'prediction'
            ? 'No predicted logs in these dates yet. Predictions appear once forecasts run.'
            : 'No logs to plot for these filters.'}
        </div>
      )}
    </figure>
  );
};

export default CustomMeasureChart;
