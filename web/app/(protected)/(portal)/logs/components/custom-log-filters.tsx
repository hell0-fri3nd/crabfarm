'use client';

import CustomSearchInput from '@/components/custom/custom-search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import CustomDateRangeFilter from './custom-date-range-filter';
import { LEVEL_FILTER_LABELS } from '../lib/log-filters';
import { PREVIEW_BATCHES } from '../lib/preview-logs';
import { levelFilterSchema } from '../types/logs';

import type { DateRangeWindow } from '../lib/log-filters';
import type { ParamUpdates } from '../lib/use-logs-search-params';
import type { LogsSearchParams } from '../types/logs';

type CustomLogFiltersProps = {
  params: LogsSearchParams;
  dateRange: DateRangeWindow;
  now: Date;
  onChange: (updates: ParamUpdates) => void;
};

const ALL_BATCHES = 'all';

const CustomLogFilters = ({ params, dateRange, now, onChange }: CustomLogFiltersProps) => {
  const isCrabTab = params.tab === 'crab';

  const handleLevelChange = (value: string) => {
    const parsed = levelFilterSchema.safeParse(value);
    if (parsed.success) onChange({ level: parsed.data === 'all' ? null : parsed.data });
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center" role="search" aria-label="Filter logs">
      <CustomSearchInput
        id="logs-search"
        label={isCrabTab ? 'Search crab logs' : 'Search sensor logs'}
        placeholder={isCrabTab ? 'Crab code or person' : 'Sensor name'}
        value={params.q}
        onChange={(q) => onChange({ q })}
      />
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <CustomDateRangeFilter dateRange={dateRange} preset={params.preset} now={now} onChange={onChange} />
        {isCrabTab ? (
          <Select value={params.batch} onValueChange={(batch) => onChange({ batch: batch === ALL_BATCHES ? null : batch })}>
            <SelectTrigger aria-label="Batch" className="data-[size=default]:h-11 w-full bg-card px-4 sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_BATCHES}>All batches</SelectItem>
              {PREVIEW_BATCHES.map((batch) => (
                <SelectItem key={batch} value={batch}>
                  {batch}
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
      </div>
    </div>
  );
};

export default CustomLogFilters;
