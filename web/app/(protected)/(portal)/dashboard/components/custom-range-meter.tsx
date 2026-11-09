import { cn } from '@/lib/utils';

import { toMeterPercent } from '../lib/sensor-meta';

type CustomRangeMeterProps = {
  value: number | null;
  safeMin: number | null;
  safeMax: number | null;
  scaleMin: number;
  scaleMax: number;
  isOutOfRange: boolean;
};

const CustomRangeMeter = ({ value, safeMin, safeMax, scaleMin, scaleMax, isOutOfRange }: CustomRangeMeterProps) => {
  const bandStart = toMeterPercent(safeMin ?? scaleMin, scaleMin, scaleMax);
  const bandEnd = toMeterPercent(safeMax ?? scaleMax, scaleMin, scaleMax);

  return (
    <div aria-hidden className="relative h-2 w-full rounded-full bg-muted">
      <span
        className="absolute inset-y-0 rounded-sm border-x-2 border-primary/70 bg-primary/25"
        style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
      />
      {value !== null && (
        <span
          className={cn(
            'absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full ring-2 ring-card',
            isOutOfRange ? 'bg-destructive' : 'bg-foreground',
          )}
          style={{ left: `${toMeterPercent(value, scaleMin, scaleMax)}%` }}
        />
      )}
    </div>
  );
};

export default CustomRangeMeter;
