'use client';

import CustomSearchInput from '@/components/custom/custom-search-input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { ACTIVITY_FILTER_LABELS } from '../lib/activity-filters';
import { activityFilterSchema } from '../types/activity';

import type { ActivityFilter, ActivityType } from '../types/activity';

type CustomActivityFiltersProps = {
  type: ActivityFilter;
  query: string;
  counts: Partial<Record<ActivityType, number>>;
  onTypeChange: (type: ActivityFilter) => void;
  onQueryChange: (query: string) => void;
};

const CustomActivityFilters = ({ type, query, counts, onTypeChange, onQueryChange }: CustomActivityFiltersProps) => {
  const handleTypeChange = (value: string) => {
    const parsed = activityFilterSchema.safeParse(value);
    if (parsed.success) onTypeChange(parsed.data);
  };

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center" role="search" aria-label="Filter activity">
      <CustomSearchInput
        id="activity-search"
        label="Search activity"
        placeholder="Person, cage or event"
        value={query}
        onChange={onQueryChange}
        className="lg:max-w-md"
      />
      <ToggleGroup
        type="single"
        spacing={2}
        value={type}
        onValueChange={handleTypeChange}
        aria-label="Event type"
        className="w-full flex-wrap lg:w-auto"
      >
        {activityFilterSchema.options.map((option) => {
          const count = option === 'all' ? null : (counts[option] ?? 0);
          return (
            <ToggleGroupItem
              key={option}
              value={option}
              className="h-11 rounded-full border border-border bg-card px-4 font-semibold data-[state=on]:border-primary/60 data-[state=on]:bg-primary/15 data-[state=on]:text-primary sm:h-9"
            >
              {ACTIVITY_FILTER_LABELS[option]}
              {count !== null && <span className="font-normal text-muted-foreground tabular-nums">{count}</span>}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
};

export default CustomActivityFilters;
