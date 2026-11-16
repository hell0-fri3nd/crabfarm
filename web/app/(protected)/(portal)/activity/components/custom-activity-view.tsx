'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, History, SearchX } from 'lucide-react';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import CustomActivityFilters from './custom-activity-filters';
import CustomActivityTable from './custom-activity-table';
import { ACTIVITY_RANGE_LABELS } from '../lib/activity-labels';
import { MAX_SHOWN, PAGE_STEP, activitySearchParamsSchema } from '../types/activity';

import type { ActivityParamKey, DayGroup, PersonOption } from '../types/activity';

type CustomActivityViewProps = {
  groups: DayGroup[];
  shownCount: number;
  total: number;
  canSeeEveryone: boolean;
  people: PersonOption[];
};

const pluralize = (count: number, noun: string) => `${count} ${count === 1 ? noun : `${noun}s`}`;

const CustomActivityView = ({ groups, shownCount, total, canSeeEveryone, people }: CustomActivityViewProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const params = activitySearchParamsSchema.parse(Object.fromEntries(searchParams));

  const hasFilters =
    params.type !== 'all' || params.q !== '' || params.range !== '7d' || params.result !== 'all' || params.person !== 'everyone';
  const hasOlder = shownCount < total;
  const canLoadOlder = hasOlder && params.shown < MAX_SHOWN;

  const navigate = (next: URLSearchParams) => {
    const query = next.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  };

  const setParams = (updates: Partial<Record<ActivityParamKey, string | null>>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!('shown' in updates)) next.delete('shown');
    navigate(next);
  };

  const handleLoadOlder = () => setParams({ shown: String(Math.min(params.shown + PAGE_STEP, MAX_SHOWN)) });

  const whose = canSeeEveryone ? 'the whole team' : 'your own activity';
  const status = `${pluralize(total, 'event')} · ${ACTIVITY_RANGE_LABELS[params.range].toLowerCase()} · ${whose}, newest first`;

  return (
    <div className="flex w-full flex-col gap-8">
      <CustomPageHeader title="Activity" status={<span>{status}</span>} />

      <div className="flex flex-col gap-5">
        <CustomActivityFilters params={params} canSeeEveryone={canSeeEveryone} people={people} onChange={setParams} />

        <div aria-busy={isPending} className={cn('flex flex-col gap-5 transition-opacity', isPending && 'opacity-60')}>
          {groups.length > 0 ? (
            <CustomActivityTable groups={groups} />
          ) : (
            <CustomEmptyState
              icon={hasFilters ? SearchX : History}
              title={hasFilters ? 'No events match these filters' : 'No activity yet'}
              hint={
                hasFilters
                  ? 'Try another type, a longer date range or a shorter search.'
                  : 'Sign-ins, crab logs, sticker downloads and changes to users show up here as they happen.'
              }
              action={
                hasFilters && (
                  <Button type="button" variant="outline" className="h-11 bg-card" onClick={() => navigate(new URLSearchParams())}>
                    Clear filters
                  </Button>
                )
              }
              className="rounded-xl border border-dashed border-border bg-card/60"
            />
          )}

          {groups.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
                Showing {shownCount} of {pluralize(total, 'event')}
              </p>
              {canLoadOlder && (
                <Button type="button" variant="outline" className="h-11 w-full bg-card px-5 sm:w-auto" onClick={handleLoadOlder}>
                  <ChevronDown aria-hidden />
                  Load older
                </Button>
              )}
              {hasOlder && !canLoadOlder && (
                <p className="text-sm text-muted-foreground">
                  Showing the newest {MAX_SHOWN}. Narrow the dates or filters to see older events.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomActivityView;
