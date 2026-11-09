'use client';

import { useState } from 'react';
import { CalendarClock, Plus, Trash } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

import CustomScheduleForm from './custom-schedule-form';
import { ALL_GROUPS_TARGET, SCHEDULE_DAY_LABELS, formatTimeInput } from '../lib/feeding-format';

import type { CageGroup, Schedule, ScheduleFormInput } from '../types/feeding';

type CustomScheduleListProps = {
  initialSchedules: Schedule[];
  groups: CageGroup[];
};

const CustomScheduleList = ({ initialSchedules, groups }: CustomScheduleListProps) => {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const setEnabled = (id: string, isEnabled: boolean) =>
    setSchedules((current) => current.map((schedule) => (schedule.id === id ? { ...schedule, is_enabled: isEnabled } : schedule)));

  const handleToggle = (schedule: Schedule, isEnabled: boolean) => {
    setEnabled(schedule.id, isEnabled);
    if (isEnabled) return;
    notify.undo(`${schedule.name} turned off`, {
      description: `The ${schedule.time_label} feed won't run until you switch it back on.`,
      onUndo: () => setEnabled(schedule.id, true),
    });
  };

  const handleDelete = (schedule: Schedule) => {
    const index = schedules.findIndex(({ id }) => id === schedule.id);
    setSchedules((current) => current.filter(({ id }) => id !== schedule.id));
    notify.undo(`${schedule.name} deleted`, {
      description: `${schedule.time_label} · ${schedule.days_label} · ${schedule.target_label}`,
      onUndo: () => setSchedules((current) => current.toSpliced(index, 0, schedule)),
    });
  };

  const handleAdd = ({ name, time, days, target }: ScheduleFormInput) => {
    const schedule: Schedule = {
      id: `${name.toLowerCase().replace(/\W+/g, '-')}-${Date.now()}`,
      name,
      time_label: formatTimeInput(time),
      days_label: SCHEDULE_DAY_LABELS[days],
      target_label: target === ALL_GROUPS_TARGET ? 'All groups' : (groups.find(({ id }) => id === target)?.name ?? target),
      is_enabled: true,
    };
    setSchedules((current) => [...current, schedule]);
    setIsFormOpen(false);
    notify.success('Schedule added', {
      description: `${schedule.name} · ${schedule.time_label}, ${schedule.days_label.toLowerCase()}`,
    });
  };

  const addButton = (
    <Button type="button" variant="outline" className="h-11 bg-card/60" onClick={() => setIsFormOpen(true)}>
      <Plus aria-hidden />
      Add schedule
    </Button>
  );

  return (
    <Card className="gap-4 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Schedules"
        description="Only cages switched on feed on a schedule."
        actions={schedules.length > 0 && addButton}
      />
      <CardContent className="px-4 sm:px-6">
        {schedules.length === 0 ? (
          <CustomEmptyState
            icon={CalendarClock}
            title="No feeding schedules"
            hint="Cages only feed when someone presses Feed now. Add a schedule to feed them on time."
            action={addButton}
          />
        ) : (
          <ul className="divide-y divide-border">
            {schedules.map((schedule) => (
              <li key={schedule.id} className="flex items-center gap-3 py-3 sm:gap-6">
                <p
                  className={cn(
                    'w-20 shrink-0 text-lg font-semibold tracking-tight tabular-nums sm:w-24',
                    !schedule.is_enabled && 'text-muted-foreground',
                  )}
                >
                  {schedule.time_label}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{schedule.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {schedule.days_label} · {schedule.target_label}
                    {!schedule.is_enabled && ' · Off'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0 bg-card/60 text-muted-foreground hover:text-destructive"
                  aria-label={`Delete the ${schedule.name} schedule`}
                  onClick={() => handleDelete(schedule)}
                >
                  <Trash aria-hidden />
                </Button>
                <Switch
                  checked={schedule.is_enabled}
                  onCheckedChange={(isChecked) => handleToggle(schedule, isChecked)}
                  aria-label={`${schedule.name} schedule on`}
                  className="relative ml-1 h-6 w-11 after:absolute after:-inset-2.5 [&>span]:size-5"
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add a feeding schedule</DialogTitle>
            <DialogDescription>Cages switched on get one portion at this time.</DialogDescription>
          </DialogHeader>
          <CustomScheduleForm groups={groups} onSubmit={handleAdd} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomScheduleList;
