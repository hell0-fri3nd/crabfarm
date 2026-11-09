'use client';

import { CircleCheck, Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import type { Cage } from '../types/feeding';

type CustomCageRowProps = {
  cage: Cage;
  isPending: boolean;
  isSystemStopped: boolean;
  onFeed: (cage: Cage) => void;
  onMarkCleared: (cage: Cage) => void;
  onScheduledChange: (cage: Cage, isScheduled: boolean) => void;
};

const STATUS_DOT = {
  ok: 'bg-primary',
  jammed: 'bg-warning',
  offline: 'bg-muted-foreground',
} as const satisfies Record<Cage['state'], string>;

const toStatusLabel = ({ state, last_fed_label, issue_label }: Cage, isPending: boolean) => {
  if (isPending) return 'Feeding…';
  if (state !== 'ok') return issue_label ?? 'Needs attention';
  return last_fed_label ? `Fed ${last_fed_label}` : 'Not fed yet today';
};

const CustomCageRow = ({ cage, isPending, isSystemStopped, onFeed, onMarkCleared, onScheduledChange }: CustomCageRowProps) => {
  const statusId = `cage-${cage.id}-status`;
  const isJammed = cage.state === 'jammed';
  const canFeed = cage.state === 'ok' && !isSystemStopped && !isPending;

  return (
    <li
      id={`cage-${cage.code}`}
      tabIndex={-1}
      className={cn(
        'flex scroll-mt-24 items-center gap-2 py-2.5 outline-none',
        isJammed && '-mx-2 rounded-lg border-transparent bg-warning/10 px-2',
        cage.state === 'offline' && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{cage.code}</p>
        <p
          id={statusId}
          className={cn(
            'flex items-center gap-1.5 text-xs',
            isJammed ? 'font-semibold text-warning' : 'text-muted-foreground',
          )}
        >
          {cage.state !== 'ok' && <span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', STATUS_DOT[cage.state])} />}
          <span className="truncate">{toStatusLabel(cage, isPending)}</span>
        </p>
      </div>

      {isJammed ? (
        <Button type="button" variant="outline" className="h-11 bg-card/60 px-3" onClick={() => onMarkCleared(cage)}>
          <CircleCheck aria-hidden />
          Mark cleared
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-11 px-3 text-muted-foreground hover:text-foreground"
          disabled={!canFeed}
          aria-describedby={statusId}
          onClick={() => onFeed(cage)}
        >
          <Utensils aria-hidden />
          {isPending ? 'Feeding…' : 'Feed now'}
        </Button>
      )}

      <Switch
        checked={cage.is_scheduled}
        onCheckedChange={(isChecked) => onScheduledChange(cage, isChecked)}
        aria-label={`Include ${cage.code} in schedules`}
        className="relative ml-1 h-6 w-11 after:absolute after:-inset-2.5 [&>span]:size-5"
      />
    </li>
  );
};

export default CustomCageRow;
