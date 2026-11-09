'use client';

import { useState } from 'react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomSensorSparkline from './custom-sensor-sparkline';
import { getPreviewSeries } from '../lib/preview-dashboard';
import { TREND_RANGE_LABELS, TREND_RANGE_START_LABELS } from '../lib/sensor-meta';
import { trendRangeSchema } from '../types/dashboard';

import type { TrendRange } from '../types/dashboard';

const CustomSensorTrends = () => {
  const [range, setRange] = useState<TrendRange>('24h');
  const series = getPreviewSeries(range);

  const handleRangeChange = (value: string) => {
    const parsed = trendRangeSchema.safeParse(value);
    if (parsed.success) setRange(parsed.data);
  };

  return (
    <Card id="sensor-trends" className="scroll-mt-20 gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Each sensor over time"
        description="Shaded band is the safe range. Hover a line for the value."
        actions={
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              value={range}
              onValueChange={handleRangeChange}
              aria-label="Time range"
              className="bg-card"
            >
              {trendRangeSchema.options.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className="h-9 px-3 data-[state=on]:bg-accent data-[state=on]:font-semibold"
                >
                  {TREND_RANGE_LABELS[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        }
      />
      <CardContent className="px-4 sm:px-6">
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {series.map((item) => (
            <li key={item.kind}>
              <CustomSensorSparkline series={item} startLabel={TREND_RANGE_START_LABELS[range]} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CustomSensorTrends;
