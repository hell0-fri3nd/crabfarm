'use client';

import { useId } from 'react';
import { ChevronRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, XAxis, YAxis } from 'recharts';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { formatKg } from '../lib/feeding-format';

import type { ChartConfig } from '@/components/ui/chart';

import type { FeedDay } from '../types/feeding';

type CustomFeedBarChartProps = {
  days: FeedDay[];
  planKg: number;
  cageCount: number;
};

const CHART_CONFIG = {
  dispensed_kg: { label: 'Dispensed (kg)', color: 'var(--primary)' },
} satisfies ChartConfig;

const PLAN_TOLERANCE_KG = 0.05;

const CustomFeedBarChart = ({ days, planKg, cageCount }: CustomFeedBarChartProps) => {
  const patternId = `under-plan-${useId().replace(/:/g, '')}`;
  const isUnderPlan = ({ dispensed_kg }: FeedDay) => dispensed_kg < planKg - PLAN_TOLERANCE_KG;
  const shortDays = days.filter(isUnderPlan);
  const summary =
    shortDays.length === 0
      ? `All ${days.length} days met the ${formatKg(planKg)} plan.`
      : `${days.length - shortDays.length} of ${days.length} days met the plan. ${shortDays
          .map(({ day, dispensed_kg }) => `${day} fell short at ${formatKg(dispensed_kg)}`)
          .join(', ')}.`;

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading title="Feed per day" description={`All ${cageCount} cages, against the plan`} />
      <CardContent className="flex flex-col gap-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span aria-hidden className="size-3 rounded-sm bg-primary" />
              Dispensed
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="w-5 border-t-2 border-dashed border-muted-foreground" />
              Plan {formatKg(planKg)}
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden className="size-3 rounded-sm" viewBox="0 0 12 12">
                <rect width="12" height="12" fill="var(--primary)" fillOpacity="0.25" />
                <path d="M-3 3 3-3M0 12 12 0M9 15 15 9" stroke="var(--primary)" strokeWidth="2" />
              </svg>
              Under plan
            </li>
          </ul>
          <p className="font-medium">{summary}</p>
        </div>

        <ChartContainer config={CHART_CONFIG} className="aspect-auto h-60 w-full md:h-72">
          <BarChart data={days} margin={{ top: 16, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="8" height="8" fill="var(--primary)" fillOpacity="0.25" />
                <line x1="0" y1="0" x2="0" y2="8" stroke="var(--primary)" strokeWidth="4" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              domain={[0, 1.6]}
              ticks={[0, 0.4, 0.8, 1.2, 1.6]}
              tickFormatter={(value: number) => `${value} kg`}
            />
            <ChartTooltip cursor={{ fillOpacity: 0.06 }} content={<ChartTooltipContent />} />
            <ReferenceLine
              y={planKg}
              stroke="var(--muted-foreground)"
              strokeDasharray="6 5"
              label={{ value: 'Plan', position: 'insideTopRight', fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <Bar dataKey="dispensed_kg" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
              {days.map((day) => (
                <Cell key={day.day} fill={isUnderPlan(day) ? `url(#${patternId})` : 'var(--color-dispensed_kg)'} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>

        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm font-semibold text-primary">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            Show as table
          </summary>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Dispensed</TableHead>
                <TableHead className="text-right">Against plan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day) => (
                <TableRow key={day.day}>
                  <TableCell className="font-medium">{day.day}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatKg(day.dispensed_kg)}</TableCell>
                  <TableCell className="text-right">{isUnderPlan(day) ? 'Under plan' : 'Met'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      </CardContent>
    </Card>
  );
};

export default CustomFeedBarChart;
