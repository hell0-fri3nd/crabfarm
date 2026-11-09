'use client';

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

import type { ChartConfig } from '@/components/ui/chart';

import type { GrowthPoint } from '../types/dashboard';

type CustomGrowthChartProps = {
  points: GrowthPoint[];
  unit: string;
};

const CHART_CONFIG = {
  actual: { label: 'Actual (logged)', color: 'var(--primary)' },
  predicted: { label: 'Predicted (model)', color: 'var(--muted-foreground)' },
} satisfies ChartConfig;

const CustomGrowthChart = ({ points, unit }: CustomGrowthChartProps) => (
  <ChartContainer config={CHART_CONFIG} className="aspect-auto h-72 w-full md:h-80">
    <LineChart data={points} margin={{ top: 12, right: 16, bottom: 4, left: 4 }}>
      <CartesianGrid vertical={false} strokeDasharray="0" />
      <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} />
      <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(value: number) => `${value} ${unit}`} />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Line
        dataKey="predicted"
        type="monotone"
        stroke="var(--color-predicted)"
        strokeWidth={2}
        strokeDasharray="6 5"
        dot={false}
        isAnimationActive={false}
      />
      <Line
        dataKey="actual"
        type="monotone"
        stroke="var(--color-actual)"
        strokeWidth={2.5}
        dot={{ r: 4, fill: 'var(--color-actual)', strokeWidth: 0 }}
        activeDot={{ r: 5 }}
        connectNulls={false}
        isAnimationActive={false}
      />
    </LineChart>
  </ChartContainer>
);

export default CustomGrowthChart;
