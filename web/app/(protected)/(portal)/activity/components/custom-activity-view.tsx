'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, History, SearchX } from 'lucide-react';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';

import CustomActivityFilters from './custom-activity-filters';
import CustomActivityTable from './custom-activity-table';
import { countByType, filterActivity, groupByDay, withinLoadedDays } from '../lib/activity-filters';
import { DAYS_PER_LOAD, PREVIEW_ACTIVITY, PREVIEW_DAYS_AVAILABLE, PREVIEW_NOW } from '../lib/preview-activity';
import { activitySearchParamsSchema } from '../types/activity';

import type { ActivityFilter } from '../types/activity';

const CustomActivityView = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = activitySearchParamsSchema.parse(Object.fromEntries(searchParams));
  const [daysLoaded, setDaysLoaded] = useState(DAYS_PER_LOAD);

  const loaded = withinLoadedDays(PREVIEW_ACTIVITY, daysLoaded, PREVIEW_NOW);
  const visible = filterActivity(loaded, params);
  const groups = groupByDay(visible, PREVIEW_NOW);
  const hasFilters = params.type !== 'all' || params.q !== '';
  const canLoadOlder = daysLoaded < PREVIEW_DAYS_AVAILABLE;

  const setParam = (key: 'type' | 'q', value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const handleClearFilters = () => router.replace(pathname, { scroll: false });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <CustomPageHeader
        title="Activity"
        status={
          <span>
            {loaded.length} events in the last {daysLoaded} days · newest first, kept for 12 months
          </span>
        }
      />

      <div className="flex flex-col gap-5">
        <CustomActivityFilters
          type={params.type}
          query={params.q}
          counts={countByType(loaded)}
          onTypeChange={(type: ActivityFilter) => setParam('type', type === 'all' ? null : type)}
          onQueryChange={(q) => setParam('q', q)}
        />

        {groups.length > 0 ? (
          <CustomActivityTable groups={groups} />
        ) : (
          <CustomEmptyState
            icon={hasFilters ? SearchX : History}
            title={hasFilters ? 'No events match these filters' : 'No activity yet'}
            hint={
              hasFilters
                ? 'Try another type or a shorter search, or load older days.'
                : 'Sign-ins, feeds, logs and changes to users show up here as they happen.'
            }
            action={
              hasFilters && (
                <Button type="button" variant="outline" className="h-11 bg-card" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )
            }
            className="rounded-xl border border-dashed border-border bg-card/60"
          />
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {visible.length} {visible.length === 1 ? 'event' : 'events'} shown
          </p>
          {canLoadOlder ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full bg-card px-5 sm:w-auto"
              onClick={() => setDaysLoaded((current) => Math.min(current + DAYS_PER_LOAD, PREVIEW_DAYS_AVAILABLE))}
            >
              <ChevronDown aria-hidden />
              Load older
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">That&apos;s everything in this preview.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomActivityView;
