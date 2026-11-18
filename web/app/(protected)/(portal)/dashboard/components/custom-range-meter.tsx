import { cn } from '@/lib/utils';

import { toMeterPercent } from '../lib/sensor-meta';

import type { SensorStatus } from '@/types/sensor';

type CustomRangeMeterProps = {
  value: number | null;
  safeMin: number | null;
  safeMax: number | null;
  scaleMin: number;
  scaleMax: number;
  status: SensorStatus | null;
};

const MARKER_COLORS = {
  normal: 'bg-foreground',
  warning: 'bg-warning',
  danger: 'bg-destructive',
} as const satisfies Record<SensorStatus, string>;

const CustomRangeMeter = ({ value, safeMin, safeMax, scaleMin, scaleMax, status }: CustomRangeMeterProps) => {
  const bandStart = toMeterPercent(safeMin ?? scaleMin, scaleMin, scaleMax);
  const bandEnd = toMeterPercent(safeMax ?? scaleMax, scaleMin, scaleMax);

  return (
    <div aria-hidden className="@container relative h-2 w-full rounded-full bg-muted">
      <span
        className="absolute inset-y-0 rounded-sm border-x-2 border-primary/70 bg-primary/25"
        style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
      />
      {value !== null && (
        // Zero width, moved in container units: a full-width layer would push the page sideways as it slides
        <span
          className="absolute inset-y-0 left-0 w-0 transition-transform duration-240 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(${toMeterPercent(value, scaleMin, scaleMax)}cqw)` }}
        >
          <span
            className={cn(
              'absolute -top-1 left-0 h-4 w-1 -translate-x-1/2 rounded-full ring-2 ring-card transition-colors duration-200 motion-safe:animate-in motion-safe:fade-in-0 motion-reduce:transition-none',
              MARKER_COLORS[status ?? 'normal'],
            )}
          />
        </span>
      )}
    </div>
  );
};

export default CustomRangeMeter;
