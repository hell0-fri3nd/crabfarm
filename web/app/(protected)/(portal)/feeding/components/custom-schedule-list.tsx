'use client';

import { useState } from 'react';
import { CalendarClock, Plus } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { notify } from '@/lib/notify';

import CustomScheduleForm from './custom-schedule-form';
import CustomScheduleRow from './custom-schedule-row';
import { createSchedule } from '../actions/create-schedule';
import { deleteSchedule } from '../actions/delete-schedule';
import { restoreSchedule } from '../actions/restore-schedule';
import { setScheduleEnabled } from '../actions/set-schedule-enabled';
import { updateSchedule } from '../actions/update-schedule';
import {
  SCHEDULE_DAY_LABELS,
  formatTimeInput,
  sortSchedules,
  toGroupsLabel,
  toScheduleFormValues,
} from '../lib/feeding-format';

import type { CageGroup, Schedule, ScheduleFormInput } from '../types/feeding';

type CustomScheduleListProps = {
  initialSchedules: Schedule[];
  groups: CageGroup[];
  canManage: boolean;
};

const FORM_FIELDS = new Set(['name', 'time', 'feed_time', 'days', 'group_codes']);

const CustomScheduleList = ({ initialSchedules, groups, canManage }: CustomScheduleListProps) => {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const openAddForm = () => {
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const openEditForm = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const setPending = (id: string, isPending: boolean) =>
    setPendingIds((current) => (isPending ? [...current, id] : current.filter((pendingId) => pendingId !== id)));

  const replaceSchedule = (schedule: Schedule) =>
    setSchedules((current) => current.map((item) => (item.id === schedule.id ? schedule : item)));

  const handleSave = async (values: ScheduleFormInput) => {
    const result = editingSchedule ? await updateSchedule(editingSchedule.id, values) : await createSchedule(values);
    if (!result.ok) {
      const fieldErrors = result.errors.filter(({ field }) => FORM_FIELDS.has(field));
      if (fieldErrors.length === 0) {
        notify.error(`Couldn't ${editingSchedule ? 'save' : 'add'} the schedule`, { description: result.message });
      }
      return fieldErrors;
    }

    const schedule = result.data;
    setSchedules((current) => sortSchedules([...current.filter(({ id }) => id !== schedule.id), schedule]));
    setIsFormOpen(false);
    notify.success(editingSchedule ? 'Schedule updated' : 'Schedule added', {
      description: `${schedule.name} · ${formatTimeInput(schedule.feed_time)}, ${SCHEDULE_DAY_LABELS[schedule.days].toLowerCase()}`,
    });
    return [];
  };

  const handleToggle = async (schedule: Schedule, isEnabled: boolean) => {
    replaceSchedule({ ...schedule, is_enabled: isEnabled });
    setPending(schedule.id, true);
    const result = await setScheduleEnabled({ id: schedule.id, is_enabled: isEnabled });
    setPending(schedule.id, false);

    if (!result.ok) {
      replaceSchedule(schedule);
      notify.error(`Couldn't turn ${isEnabled ? 'on' : 'off'} ${schedule.name}`, { description: result.message });
      return;
    }

    replaceSchedule(result.data);
    if (isEnabled) {
      notify.success(`${schedule.name} turned on`);
      return;
    }
    notify.undo(`${schedule.name} turned off`, {
      description: `The ${formatTimeInput(schedule.feed_time)} feed won't run until you switch it back on.`,
      onUndo: () => void handleToggle(result.data, true),
    });
  };

  const handleRestore = async (schedule: Schedule) => {
    const result = await restoreSchedule(schedule.id);
    if (!result.ok) {
      notify.error(`Couldn't restore ${schedule.name}`, { description: result.message });
      return;
    }
    setSchedules((current) => sortSchedules([...current, result.data]));
    notify.success(`${schedule.name} restored`);
  };

  const handleDelete = async (schedule: Schedule) => {
    setPending(schedule.id, true);
    const result = await deleteSchedule(schedule.id);
    setPending(schedule.id, false);

    if (!result.ok) {
      notify.error(`Couldn't delete ${schedule.name}`, { description: result.message });
      return;
    }

    setSchedules((current) => current.filter(({ id }) => id !== schedule.id));
    notify.undo(`${schedule.name} deleted`, {
      description: `${formatTimeInput(schedule.feed_time)} · ${SCHEDULE_DAY_LABELS[schedule.days]} · ${toGroupsLabel(schedule.group_codes, groups)}`,
      onUndo: () => void handleRestore(schedule),
    });
  };

  // Hidden, not disabled, for roles that can't manage schedules: the same decision as New batch (03 §16)
  const addButton = canManage && (
    <Button type="button" variant="outline" className="h-11 bg-card/60" onClick={openAddForm}>
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
            hint={canManage ? 'Add one to feed your cages on time.' : 'Ask an admin to add one.'}
            action={addButton}
          />
        ) : (
          <ul className="divide-y divide-border">
            {schedules.map((schedule) => (
              <CustomScheduleRow
                key={schedule.id}
                schedule={schedule}
                groups={groups}
                isPending={pendingIds.includes(schedule.id)}
                canManage={canManage}
                onToggle={(item, isEnabled) => void handleToggle(item, isEnabled)}
                onEdit={openEditForm}
                onDelete={(item) => void handleDelete(item)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? `Edit ${editingSchedule.name}` : 'Add a feeding schedule'}</DialogTitle>
            <DialogDescription>Active cages in these groups get one portion at this time.</DialogDescription>
          </DialogHeader>
          <CustomScheduleForm
            key={editingSchedule?.id ?? 'new'}
            groups={groups}
            initialValues={editingSchedule ? toScheduleFormValues(editingSchedule) : undefined}
            submitLabel={editingSchedule ? 'Save changes' : undefined}
            pendingLabel={editingSchedule ? 'Saving…' : undefined}
            onSubmit={handleSave}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default CustomScheduleList;
