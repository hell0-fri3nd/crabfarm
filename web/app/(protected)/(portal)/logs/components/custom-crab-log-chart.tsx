'use client';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import CustomLegendSwatch from './custom-legend-swatch';
import CustomMeasureChart from './custom-measure-chart';

import type { CrabLogChart } from '../types/logs';

type CustomCrabLogChartProps = {
  chart: CrabLogChart;
  onCrabChange: (crabName: string) => void;
};

const pluralizeDays = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;

const countDays = ({ points }: CrabLogChart, kind: 'actual' | 'forecast') =>
  points.filter((point) => point[`${kind}_weight_g`] !== null || point[`${kind}_width_mm`] !== null).length;

const toDescription = (chart: CrabLogChart) => {
  if (!chart.crab_code) return 'No crab logs match these filters.';

  const coverage = `${chart.crab_code}: ${pluralizeDays(countDays(chart, 'actual'))} logged, ${pluralizeDays(countDays(chart, 'forecast'))} forecast.`;
  return chart.plotted < chart.crab_total
    ? `${coverage} Showing the newest ${chart.plotted} of ${chart.crab_total} logs.`
    : coverage;
};

const CustomCrabLogChart = ({ chart, onCrabChange }: CustomCrabLogChartProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title="Crab growth"
      description={toDescription(chart)}
      actions={
        <Select value={chart.crab_name ?? undefined} onValueChange={onCrabChange} disabled={chart.crab_names.length === 0}>
          <SelectTrigger aria-label="Crab" className="w-full bg-card data-[size=default]:h-11 sm:w-36">
            <span className="text-muted-foreground">Crab</span>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            {chart.crab_names.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    />
    <CardContent className="flex flex-col gap-6 px-4 sm:px-6">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <CustomMeasureChart points={chart.points} measure="weight_g" crabName={chart.crab_name} />
        <CustomMeasureChart points={chart.points} measure="width_mm" crabName={chart.crab_name} />
      </div>
      {chart.plotted > 0 && (
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CustomLegendSwatch isDashed={false} />
            Actual (logged on Scan)
          </li>
          <li className="flex items-center gap-2">
            <CustomLegendSwatch isDashed />
            Forecast (from the growth model)
          </li>
        </ul>
      )}
    </CardContent>
  </Card>
);

export default CustomCrabLogChart;
