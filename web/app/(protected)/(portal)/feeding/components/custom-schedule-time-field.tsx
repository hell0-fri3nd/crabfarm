'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import {
  SCHEDULE_HOURS,
  SCHEDULE_MINUTES,
  SCHEDULE_PERIODS,
  toTimeParts,
  toTimeValue,
} from '../lib/feeding-format';

import type { ScheduleTimeParts } from '../lib/feeding-format';

type CustomScheduleTimeFieldProps = {
  id: string;
  value: string;
  isInvalid: boolean;
  describedBy?: string;
  onChange: (time: string) => void;
};

const SEGMENT_CLASS =
  'h-11 min-w-12 border-input bg-card px-3 tabular-nums data-[state=on]:bg-primary/15 data-[state=on]:font-semibold data-[state=on]:text-primary';

const CustomScheduleTimeField = ({ id, value, isInvalid, describedBy, onChange }: CustomScheduleTimeFieldProps) => {
  const parts = toTimeParts(value);
  const update = (changes: Partial<ScheduleTimeParts>) => onChange(toTimeValue({ ...parts, ...changes }));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={parts.hour} onValueChange={(hour) => update({ hour: hour as ScheduleTimeParts['hour'] })}>
        <SelectTrigger
          id={id}
          aria-label="Hour"
          aria-invalid={isInvalid}
          aria-describedby={describedBy}
          className="data-[size=default]:h-11 w-20 bg-card tabular-nums"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCHEDULE_HOURS.map((hour) => (
            <SelectItem key={hour} value={hour}>
              {hour}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <ToggleGroup
        type="single"
        variant="outline"
        value={parts.minute}
        aria-label="Minutes"
        onValueChange={(minute) => minute && update({ minute: minute as ScheduleTimeParts['minute'] })}
      >
        {SCHEDULE_MINUTES.map((minute) => (
          <ToggleGroupItem key={minute} value={minute} aria-label={`${minute} minutes`} className={SEGMENT_CLASS}>
            :{minute}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <ToggleGroup
        type="single"
        variant="outline"
        value={parts.period}
        aria-label="AM or PM"
        onValueChange={(period) => period && update({ period: period as ScheduleTimeParts['period'] })}
      >
        {SCHEDULE_PERIODS.map((period) => (
          <ToggleGroupItem key={period} value={period} className={SEGMENT_CLASS}>
            {period}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};

export default CustomScheduleTimeField;
