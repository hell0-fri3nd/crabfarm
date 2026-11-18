'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomGrowthChart from './custom-growth-chart';
import { ALL_BATCHES, DEFAULT_GROWTH_RANGE, GROWTH_RANGE_LABELS, GROWTH_UNITS, toGrowthPoints } from '../lib/growth-points';
import { growthMetricSchema, growthRangeSchema } from '../types/dashboard';

import type { GrowthData, GrowthMetric } from '../types/dashboard';

type CustomGrowthCardProps = {
  data: GrowthData;
};

const METRIC_LABELS = { weight: 'Weight', width: 'Width' } as const satisfies Record<GrowthMetric, string>;

const NUMBER_FORMAT = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const formatValue = (value: number | null | undefined, unit: string) =>
  value === null || value === undefined ? '—' : `${NUMBER_FORMAT.format(value)} ${unit}`;

const CustomGrowthCard = ({ data: { range, days, logs, batches } }: CustomGrowthCardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isChangingRange, startRangeChange] = useTransition();
  const [batch, setBatch] = useState(ALL_BATCHES);
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const points = toGrowthPoints(days, logs, batch, metric);
  const unit = GROWTH_UNITS[metric];
  const latestActual = points.findLast(({ actual }) => actual !== null);
  const latestPredicted = points.findLast(({ predicted }) => predicted !== null);
  const hasAny = Boolean(latestActual ?? latestPredicted);
  const scope = batch === ALL_BATCHES ? 'All batches' : `Batch ${batch}`;
  const span = `${days[0]?.label ?? ''} – ${days.at(-1)?.label ?? ''}`;
  const rangeLabel = GROWTH_RANGE_LABELS[range];
  const isMonthly = range === '12m';
  const datePrefix = isMonthly ? 'in' : 'on';

  const handleRangeChange = (value: string) => {
    const parsed = growthRangeSchema.safeParse(value);
    if (!parsed.success) return;
    const next = new URLSearchParams(searchParams);
    if (parsed.data === DEFAULT_GROWTH_RANGE) next.delete('growth');
    else next.set('growth', parsed.data);
    const query = next.toString();
    startRangeChange(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const handleMetricChange = (value: string) => {
    const parsed = growthMetricSchema.safeParse(value);
    if (parsed.success) setMetric(parsed.data);
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Actual vs forecast growth"
        description={`${scope} · ${rangeLabel.toLowerCase()}, ${span} · ${isMonthly ? 'monthly' : 'daily'} average of logged crabs`}
        actions={
          <>
            <Select value={range} onValueChange={handleRangeChange}>
              <SelectTrigger aria-label="Date range" className="h-9 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {growthRangeSchema.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {GROWTH_RANGE_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger aria-label="Batch" className="h-9 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_BATCHES}>All batches</SelectItem>
                {batches.map((id) => (
                  <SelectItem key={id} value={String(id)}>
                    Batch {id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              variant="outline"
              value={metric}
              onValueChange={handleMetricChange}
              aria-label="Measurement"
              className="bg-card"
            >
              {growthMetricSchema.options.map((option) => (
                <ToggleGroupItem
                  key={option}
                  value={option}
                  className="h-9 px-3 data-[state=on]:bg-accent data-[state=on]:font-semibold"
                >
                  {METRIC_LABELS[option]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </>
        }
      />

      <CardContent
        aria-busy={isChangingRange}
        className={cn('flex flex-col gap-4 px-4 transition-opacity sm:px-6', isChangingRange && 'opacity-60')}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <ul className="flex items-center gap-5 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-5 rounded-full bg-primary" />
              Actual (logged)
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="w-5 border-t-2 border-dashed border-muted-foreground" />
              Forecast (model)
            </li>
          </ul>
          {hasAny && (
            <p className="font-medium tabular-nums">
              Actual {formatValue(latestActual?.actual, unit)}
              {latestActual && ` ${datePrefix} ${latestActual.label}`} · Forecast {formatValue(latestPredicted?.predicted, unit)}
              {latestPredicted && ` ${datePrefix} ${latestPredicted.label}`}
            </p>
          )}
        </div>

        {hasAny ? (
          <CustomGrowthChart points={points} unit={unit} />
        ) : (
          <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground md:h-80">
            No crab logs for {scope.toLowerCase()} in the {rangeLabel.toLowerCase()}. Logs saved on Scan crab show up here.
          </div>
        )}

        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            Show as table
          </summary>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>{isMonthly ? 'Month' : 'Date'}</TableHead>
                <TableHead className="text-right">Actual ({unit})</TableHead>
                <TableHead className="text-right">Forecast ({unit})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map(({ label, actual, predicted }) => (
                <TableRow key={label}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell className="text-right tabular-nums">{actual === null ? '—' : NUMBER_FORMAT.format(actual)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {predicted === null ? '—' : NUMBER_FORMAT.format(predicted)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </details>
      </CardContent>
    </Card>
  );
};

export default CustomGrowthCard;
