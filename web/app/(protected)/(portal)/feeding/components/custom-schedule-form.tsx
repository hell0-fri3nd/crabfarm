'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { ALL_GROUPS_TARGET, SCHEDULE_DAY_LABELS } from '../lib/feeding-format';
import { SCHEDULE_DAYS, scheduleFormSchema } from '../types/feeding';

import type { CageGroup, ScheduleFormInput } from '../types/feeding';

type CustomScheduleFormProps = {
  groups: CageGroup[];
  onSubmit: (values: ScheduleFormInput) => void;
};

const CustomScheduleForm = ({ groups, onSubmit }: CustomScheduleFormProps) => {
  const form = useForm<ScheduleFormInput>({
    resolver: zodResolver(scheduleFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { name: '', time: '06:00', days: 'every-day', target: ALL_GROUPS_TARGET },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup className="gap-6">
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-name">Name</FieldLabel>
              <Input
                {...field}
                id="schedule-name"
                placeholder="Morning"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? 'schedule-name-error' : undefined}
                className="h-11 bg-card"
              />
              <FieldError id="schedule-name-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <Controller
            name="time"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="schedule-time">Time</FieldLabel>
                <Input
                  {...field}
                  id="schedule-time"
                  type="time"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'schedule-time-error' : undefined}
                  className="h-11 bg-card"
                />
                <FieldError id="schedule-time-error" errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="days"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="schedule-days">Days</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="schedule-days" className="data-[size=default]:h-11 w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHEDULE_DAYS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SCHEDULE_DAY_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        <Controller
          name="target"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-target">Cages</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="schedule-target" className="data-[size=default]:h-11 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_GROUPS_TARGET}>All groups</SelectItem>
                  {groups.map(({ id, name }) => (
                    <SelectItem key={id} value={id}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <DialogFooter className="gap-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-11">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="h-11" disabled={form.formState.isSubmitting}>
            Add schedule
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
};

export default CustomScheduleForm;
