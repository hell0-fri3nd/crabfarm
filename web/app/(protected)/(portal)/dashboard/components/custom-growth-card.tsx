'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomGrowthChart from './custom-growth-chart';
import { GROWTH_UNITS, PREVIEW_BATCHES, getPreviewGrowth } from '../lib/preview-dashboard';
import { growthMetricSchema } from '../types/dashboard';

import type { GrowthMetric } from '../types/dashboard';

const METRIC_LABELS = { weight: 'Weight', width: 'Width' } as const satisfies Record<GrowthMetric, string>;

const CustomGrowthCard = () => {
  const [batch, setBatch] = useState<string>(PREVIEW_BATCHES[0]);
  const [metric, setMetric] = useState<GrowthMetric>('weight');
  const points = getPreviewGrowth(metric);
  const unit = GROWTH_UNITS[metric];
  const latestActual = points.findLast(({ actual }) => actual !== null)?.actual;
  const nextPredicted = points.at(-1)?.predicted;
  const batchNumber = batch.replace(/\D/g, '');

  const handleMetricChange = (value: string) => {
    const parsed = growthMetricSchema.safeParse(value);
    if (parsed.success) setMetric(parsed.data);
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Predicted vs actual growth"
        description={`Batch ${batchNumber} · average of logged crabs per week`}
        actions={
          <>
            <Select value={batch} onValueChange={setBatch}>
              <SelectTrigger aria-label="Batch" className="h-9 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREVIEW_BATCHES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
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

      <CardContent className="flex flex-col gap-4 px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <ul className="flex items-center gap-5 text-muted-foreground">
            <li className="flex items-center gap-2">
              <span aria-hidden className="h-0.5 w-5 rounded-full bg-primary" />
              Actual (logged)
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="w-5 border-t-2 border-dashed border-muted-foreground" />
              Predicted (model)
            </li>
          </ul>
          <p className="font-medium tabular-nums">
            Actual {latestActual ?? '—'} {unit} · Predicted {nextPredicted ?? '—'} {unit} next week
          </p>
        </div>

        <CustomGrowthChart points={points} unit={unit} />

        <details className="group">
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm font-semibold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
            Show as table
          </summary>
          <Table className="mt-3">
            <TableHeader>
              <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Actual ({unit})</TableHead>
                <TableHead className="text-right">Predicted ({unit})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {points.map(({ week, actual, predicted }) => (
                <TableRow key={week}>
                  <TableCell className="font-medium">{week}</TableCell>
                  <TableCell className="text-right tabular-nums">{actual ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{predicted ?? '—'}</TableCell>
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
