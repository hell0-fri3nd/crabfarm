'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { DATE_PRESET_LABELS, toDateParam } from '../lib/log-filters';
import { datePresetSchema } from '../types/logs';

import type { DateRange } from 'react-day-picker';

import type { DateRangeWindow } from '../lib/log-filters';
import type { ParamUpdates } from '../lib/use-logs-search-params';
import type { DatePreset } from '../types/logs';

type CustomDateRangeFilterProps = {
  dateRange: DateRangeWindow;
  preset: DatePreset;
  now: Date;
  onChange: (updates: ParamUpdates) => void;
};

const CustomDateRangeFilter = ({ dateRange, preset, now, onChange }: CustomDateRangeFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>();

  const handlePreset = (next: DatePreset) => {
    onChange({ preset: next === '7d' ? null : next, from: null, to: null });
    setDraft(undefined);
    setIsOpen(false);
  };

  const handleSelect = (range: DateRange | undefined) => {
    setDraft(range);
    if (!range?.from || !range.to) return;
    onChange({ preset: null, from: toDateParam(range.from), to: toDateParam(range.to) });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 justify-start bg-card px-4">
          <CalendarIcon aria-hidden />
          <span className="sr-only">Date range: </span>
          {dateRange.label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex flex-col gap-1 border-b border-border p-2" role="group" aria-label="Quick ranges">
          {datePresetSchema.options.map((option) => {
            const isSelected = !dateRange.isCustom && preset === option;
            return (
              <Button
                key={option}
                type="button"
                variant="ghost"
                aria-pressed={isSelected}
                onClick={() => handlePreset(option)}
                className={cn('h-10 justify-start', isSelected && 'bg-accent font-semibold text-primary')}
              >
                {DATE_PRESET_LABELS[option]}
              </Button>
            );
          })}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={1}
          defaultMonth={dateRange.to}
          selected={draft ?? (dateRange.isCustom ? { from: dateRange.from, to: dateRange.to } : undefined)}
          onSelect={handleSelect}
          disabled={{ after: now }}
        />
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">Pick a start day, then an end day.</p>
      </PopoverContent>
    </Popover>
  );
};

export default CustomDateRangeFilter;
