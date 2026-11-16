'use client';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomLegendSwatch from './custom-legend-swatch';
import CustomMeasureChart from './custom-measure-chart';
import { chartSeriesSchema } from '../types/logs';

import type { ChartBucket, ChartSeries, CrabLogChart } from '../types/logs';

type CustomCrabLogChartProps = {
  chart: CrabLogChart;
  series: ChartSeries;
  onSeriesChange: (series: ChartSeries) => void;
};

const SERIES_LABELS = { actual: 'Actual', prediction: 'Predicted' } as const satisfies Record<ChartSeries, string>;

const SERIES_LEGEND = {
  actual: 'Actual (solid, logged on Scan)',
  prediction: 'Predicted (dashed, from the forecast)',
} as const satisfies Record<ChartSeries, string>;

const BUCKET_LABELS = { day: 'day', hour: 'hour', minute: 'minute', second: 'second' } as const satisfies Record<ChartBucket, string>;

const CHIP =
  'h-11 rounded-full border border-border bg-card px-4 font-semibold data-[state=on]:border-primary/60 data-[state=on]:bg-primary/15 data-[state=on]:text-primary sm:h-9';

const pluralize = (count: number, noun: string) => `${count} ${count === 1 ? noun : `${noun}s`}`;

const CustomCrabLogChart = ({ chart: { bucket, points, plotted, total }, series, onSeriesChange }: CustomCrabLogChartProps) => {
  const per = BUCKET_LABELS[bucket];
  const span = `${pluralize(plotted, 'log')} over ${pluralize(points.length, per)}`;

  const handleSeries = (value: string) => {
    const parsed = chartSeriesSchema.safeParse(value);
    if (parsed.success) onSeriesChange(parsed.data);
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Growth over time"
        description={
          plotted < total
            ? `Newest ${plotted} of ${total} logs, averaged per ${per}. Narrow the dates to plot the rest.`
            : `${span[0]?.toUpperCase() ?? ''}${span.slice(1)}, averaged per ${per}.`
        }
        actions={
          <ToggleGroup type="single" spacing={2} value={series} onValueChange={handleSeries} aria-label="Line to show">
            {chartSeriesSchema.options.map((option) => (
              <ToggleGroupItem key={option} value={option} className={CHIP}>
                {SERIES_LABELS[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
      <CardContent className="flex flex-col gap-6 px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <CustomMeasureChart points={points} measure="weight_g" series={series} />
          <CustomMeasureChart points={points} measure="width_mm" series={series} />
        </div>
        {plotted > 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CustomLegendSwatch isDashed={series === 'prediction'} />
            {SERIES_LEGEND[series]}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomCrabLogChart;
