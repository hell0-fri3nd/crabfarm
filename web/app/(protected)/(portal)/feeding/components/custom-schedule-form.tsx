'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

import CustomScheduleTimeField from './custom-schedule-time-field';
import { SCHEDULE_DAY_LABELS, formatTimeInput, toGroupsLabel } from '../lib/feeding-format';
import { SCHEDULE_DAYS, scheduleFormSchema } from '../types/feeding';

import type { FieldError as ApiFieldError } from '@/types/api';
import type { CageGroup, ScheduleFormInput } from '../types/feeding';

type CustomScheduleFormProps = {
  groups: CageGroup[];
  initialValues?: ScheduleFormInput;
  submitLabel?: string;
  pendingLabel?: string;
  onSubmit: (values: ScheduleFormInput) => Promise<ApiFieldError[]>;
};

const API_FIELDS: Record<string, keyof ScheduleFormInput> = {
  name: 'name',
  feed_time: 'time',
  time: 'time',
  days: 'days',
  group_codes: 'group_codes',
};

// A tint, not the solid accent, so Add schedule stays the one primary action (Von Restorff)
const CHIP_CLASS =
  'group/chip h-11 min-w-11 gap-1.5 rounded-[10px] border border-input bg-card px-3 font-semibold data-[state=on]:border-primary data-[state=on]:bg-primary/15 data-[state=on]:text-primary';

const CustomScheduleForm = ({
  groups,
  initialValues,
  submitLabel = 'Add schedule',
  pendingLabel = 'Adding…',
  onSubmit,
}: CustomScheduleFormProps) => {
  const allCodes = groups.map(({ id }) => id);
  const form = useForm<ScheduleFormInput>({
    resolver: zodResolver(scheduleFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: initialValues ?? { name: '', time: '06:00', days: 'every-day', group_codes: allCodes },
  });
  const [time, days, groupCodes] = useWatch({ control: form.control, name: ['time', 'days', 'group_codes'] });
  const { isSubmitting } = form.formState;

  const handleSubmit = async (values: ScheduleFormInput) => {
    const errors = await onSubmit(values);
    errors.forEach(({ field, message }, index) => {
      const name = API_FIELDS[field];
      if (name) form.setError(name, { message }, { shouldFocus: index === 0 });
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)}>
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
                maxLength={40}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? 'schedule-name-error' : undefined}
                className="h-11 bg-card text-base md:text-sm"
              />
              <FieldError id="schedule-name-error" errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          name="time"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="schedule-time">Time</FieldLabel>
              <CustomScheduleTimeField
                id="schedule-time"
                value={field.value}
                isInvalid={fieldState.invalid}
                describedBy={fieldState.invalid ? 'schedule-time-error' : undefined}
                onChange={field.onChange}
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

        <Controller
          name="group_codes"
          control={form.control}
          render={({ field, fieldState }) => {
            const isAllPicked = allCodes.length > 0 && allCodes.every((code) => field.value.includes(code));
            const handleChange = (codes: string[]) => field.onChange(codes.toSorted());

            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel id="schedule-groups-label">Groups</FieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={isAllPicked}
                    data-state={isAllPicked ? 'on' : 'off'}
                    className={cn(CHIP_CLASS, 'hover:bg-accent')}
                    onClick={() => handleChange(isAllPicked ? [] : allCodes)}
                  >
                    {isAllPicked && <Check aria-hidden />}
                    All
                  </Button>
                  <ToggleGroup
                    type="multiple"
                    spacing={2}
                    value={field.value}
                    onValueChange={handleChange}
                    aria-labelledby="schedule-groups-label"
                    aria-describedby={fieldState.invalid ? 'schedule-groups-error' : undefined}
                    className="flex-wrap"
                  >
                    {groups.map(({ id, name }) => (
                      <ToggleGroupItem key={id} value={id} aria-label={name} className={CHIP_CLASS}>
                        <Check aria-hidden className="hidden group-data-[state=on]/chip:block" />
                        {id}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
                <FieldError id="schedule-groups-error" errors={[fieldState.error]} />
              </Field>
            );
          }}
        />

        <div className="flex items-baseline gap-3 rounded-[10px] bg-muted/50 px-4 py-3" aria-live="polite">
          <p className="shrink-0 text-lg font-semibold tracking-tight tabular-nums">{formatTimeInput(time)}</p>
          <p className="min-w-0 text-sm text-muted-foreground">
            {SCHEDULE_DAY_LABELS[days]} · {toGroupsLabel(groupCodes, groups)}
          </p>
        </div>

        <DialogFooter className="gap-3">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-11">
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" className="h-11" disabled={isSubmitting} aria-busy={isSubmitting}>
            {isSubmitting ? pendingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  );
};

export default CustomScheduleForm;
