'use client';

import CustomSearchInput from '@/components/custom/custom-search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { ACTIVITY_FILTER_LABELS, ACTIVITY_RANGE_LABELS, ACTIVITY_RESULT_LABELS } from '../lib/activity-labels';
import { activityFilterSchema, activityRangeSchema, activityResultSchema } from '../types/activity';

import type { ActivityParamKey, ActivitySearchParams, PersonOption } from '../types/activity';

type CustomActivityFiltersProps = {
  params: ActivitySearchParams;
  canSeeEveryone: boolean;
  people: PersonOption[];
  onChange: (updates: Partial<Record<ActivityParamKey, string | null>>) => void;
};

const SELECT_CLASS = 'data-[size=default]:h-11 w-full bg-card px-4 sm:w-44';

const CustomActivityFilters = ({ params, canSeeEveryone, people, onChange }: CustomActivityFiltersProps) => {
  const handleType = (value: string) => {
    const parsed = activityFilterSchema.safeParse(value);
    if (parsed.success) onChange({ type: parsed.data === 'all' ? null : parsed.data });
  };

  const handleRange = (value: string) => {
    const parsed = activityRangeSchema.safeParse(value);
    if (parsed.success) onChange({ range: parsed.data === '7d' ? null : parsed.data });
  };

  const handleResult = (value: string) => {
    const parsed = activityResultSchema.safeParse(value);
    if (parsed.success) onChange({ result: parsed.data === 'all' ? null : parsed.data });
  };

  return (
    <div className="flex flex-col gap-3" role="search" aria-label="Filter activity">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <CustomSearchInput
          id="activity-search"
          label="Search activity"
          placeholder={canSeeEveryone ? 'Email, event or page' : 'Event or page'}
          value={params.q}
          onChange={(q) => onChange({ q })}
        />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <Select value={params.range} onValueChange={handleRange}>
            <SelectTrigger aria-label="Date range" className={SELECT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activityRangeSchema.options.map((range) => (
                <SelectItem key={range} value={range}>
                  {ACTIVITY_RANGE_LABELS[range]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={params.result} onValueChange={handleResult}>
            <SelectTrigger aria-label="Result" className={SELECT_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {activityResultSchema.options.map((result) => (
                <SelectItem key={result} value={result}>
                  {ACTIVITY_RESULT_LABELS[result]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canSeeEveryone && (
            <Select value={params.person} onValueChange={(person) => onChange({ person: person === 'everyone' ? null : person })}>
              <SelectTrigger aria-label="Person" className={SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="me">Only me</SelectItem>
                {people.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <ToggleGroup
        type="single"
        spacing={2}
        value={params.type}
        onValueChange={handleType}
        aria-label="Event type"
        className="w-full flex-wrap justify-start"
      >
        {activityFilterSchema.options.map((option) => (
          <ToggleGroupItem
            key={option}
            value={option}
            className="h-11 rounded-full border border-border bg-card px-4 font-semibold data-[state=on]:border-primary/60 data-[state=on]:bg-primary/15 data-[state=on]:text-primary sm:h-9"
          >
            {ACTIVITY_FILTER_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default CustomActivityFilters;
