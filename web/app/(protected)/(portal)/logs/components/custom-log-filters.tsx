'use client';

import CustomSearchInput from '@/components/custom/custom-search-input';
import { ChartLine, Rows3 } from 'lucide-react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomDateRangeFilter from './custom-date-range-filter';
import { LEVEL_FILTER_LABELS, LOG_TYPE_FILTER_LABELS } from '../lib/log-filters';
import { levelFilterSchema, logTypeFilterSchema, logViewSchema } from '../types/logs';

import type { DateRangeWindow } from '../lib/log-filters';
import type { ParamUpdates } from '../lib/use-logs-search-params';
import type { LogsSearchParams } from '../types/logs';

export type BatchOption = {
  value: string;
  label: string;
};

type CustomLogFiltersProps = {
  params: LogsSearchParams;
  batches: BatchOption[];
  dateRange: DateRangeWindow;
  now: Date;
  onChange: (updates: ParamUpdates) => void;
};

const ALL_BATCHES = 'all';

const CustomLogFilters = ({ params, batches, dateRange, now, onChange }: CustomLogFiltersProps) => {
  const isCrabTab = params.tab === 'crab';

  const handleLevelChange = (value: string) => {
    const parsed = levelFilterSchema.safeParse(value);
    if (parsed.success) onChange({ level: parsed.data === 'all' ? null : parsed.data });
  };

  const isChart = isCrabTab && params.view === 'chart';

  const handleViewChange = (value: string) => {
    const parsed = logViewSchema.safeParse(value);
    if (parsed.success) onChange({ view: parsed.data === 'table' ? null : parsed.data });
  };

  const handleTypeChange = (value: string) => {
    const parsed = logTypeFilterSchema.safeParse(value);
    if (parsed.success) onChange({ type: parsed.data === 'all' ? null : parsed.data });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center" role="search" aria-label="Filter logs">
      <CustomSearchInput
        id="logs-search"
        label={isCrabTab ? 'Search crab logs' : 'Search sensor logs'}
        placeholder={isCrabTab ? 'Crab code, like B1-A1' : 'Sensor name'}
        value={params.q}
        onChange={(q) => onChange({ q })}
      />
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <CustomDateRangeFilter dateRange={dateRange} preset={params.preset} now={now} onChange={onChange} />
        {isCrabTab && !isChart && (
          <Select value={params.type} onValueChange={handleTypeChange}>
            <SelectTrigger aria-label="Log type" className="data-[size=default]:h-11 w-full bg-card px-4 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {logTypeFilterSchema.options.map((type) => (
                <SelectItem key={type} value={type}>
                  {LOG_TYPE_FILTER_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isCrabTab ? (
          <Select value={params.batch} onValueChange={(batch) => onChange({ batch: batch === ALL_BATCHES ? null : batch })}>
            <SelectTrigger aria-label="Batch" className="data-[size=default]:h-11 w-full bg-card px-4 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BATCHES}>All batches</SelectItem>
              {batches.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select value={params.level} onValueChange={handleLevelChange}>
            <SelectTrigger aria-label="Level" className="data-[size=default]:h-11 w-full bg-card px-4 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelFilterSchema.options.map((level) => (
                <SelectItem key={level} value={level}>
                  {LEVEL_FILTER_LABELS[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isCrabTab && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={params.view}
            onValueChange={handleViewChange}
            aria-label="Show crab logs as"
            className="col-span-2 h-11 w-full bg-card sm:col-span-1 sm:w-auto"
          >
            <ToggleGroupItem value="table" className="h-11 flex-1 px-4 sm:flex-none">
              <Rows3 aria-hidden />
              Table
            </ToggleGroupItem>
            <ToggleGroupItem value="chart" className="h-11 flex-1 px-4 sm:flex-none">
              <ChartLine aria-hidden />
              Chart
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </div>
    </div>
  );
};

export default CustomLogFilters;
