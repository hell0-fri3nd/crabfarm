'use client';

import { Pencil, Trash } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

import { SCHEDULE_DAY_LABELS, formatTimeInput, toGroupsLabel } from '../lib/feeding-format';

import type { CageGroup, Schedule } from '../types/feeding';

type CustomScheduleRowProps = {
  schedule: Schedule;
  groups: CageGroup[];
  isPending: boolean;
  canManage: boolean;
  onToggle: (schedule: Schedule, isEnabled: boolean) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
};

const ICON_BUTTON_CLASS = 'size-11 shrink-0 bg-card/60 text-muted-foreground';

const CustomScheduleRow = ({
  schedule,
  groups,
  isPending,
  canManage,
  onToggle,
  onEdit,
  onDelete,
}: CustomScheduleRowProps) => (
  <li className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:flex-nowrap sm:gap-x-6" aria-busy={isPending}>
    <div className={cn('flex min-w-0 flex-1 items-center gap-3 sm:basis-0 sm:gap-6', canManage && 'basis-full')}>
      <p
        className={cn(
          'w-20 shrink-0 text-lg font-semibold tracking-tight tabular-nums sm:w-24',
          !schedule.is_enabled && 'text-muted-foreground',
        )}
      >
        {formatTimeInput(schedule.feed_time)}
      </p>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{schedule.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {SCHEDULE_DAY_LABELS[schedule.days]} · {toGroupsLabel(schedule.group_codes, groups)}
          {!schedule.is_enabled && ' · Off'}
        </p>
      </div>
    </div>
    <div className="ml-auto flex items-center gap-2 sm:gap-3">
      {canManage && (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isPending}
            className={cn(ICON_BUTTON_CLASS, 'hover:text-foreground')}
            aria-label={`Edit the ${schedule.name} schedule`}
            onClick={() => onEdit(schedule)}
          >
            <Pencil aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={isPending}
            className={cn(ICON_BUTTON_CLASS, 'hover:text-destructive')}
            aria-label={`Delete the ${schedule.name} schedule`}
            onClick={() => onDelete(schedule)}
          >
            <Trash aria-hidden />
          </Button>
        </>
      )}
      <Switch
        checked={schedule.is_enabled}
        disabled={isPending}
        onCheckedChange={(isChecked) => onToggle(schedule, isChecked)}
        aria-label={`${schedule.name} schedule on`}
        className="relative ml-2 h-6 w-11 after:absolute after:-inset-2.5 [&>span]:size-5 sm:ml-3"
      />
    </div>
  </li>
);

export default CustomScheduleRow;
