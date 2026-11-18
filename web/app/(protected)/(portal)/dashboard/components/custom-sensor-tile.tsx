import CustomSensorStatusBadge from '@/components/custom/custom-sensor-status-badge';
import { Card } from '@/components/ui/card';
import { SENSOR_ICONS } from '@/lib/sensor-icons';
import { cn } from '@/lib/utils';

import CustomRangeMeter from './custom-range-meter';
import CustomReadingValue from './custom-reading-value';

import type { SensorReading } from '../types/dashboard';

type CustomSensorTileProps = {
  reading: SensorReading;
};

const CustomSensorTile = ({ reading }: CustomSensorTileProps) => {
  const { kind, label, unit, value, decimals, status, safe_label, change_label, last_seen_label } = reading;
  const Icon = SENSOR_ICONS[kind];
  const hasReading = value !== null;
  const lastSeen = last_seen_label ? `Last seen ${last_seen_label}` : 'Not seen yet';

  return (
    <Card
      className={cn(
        'gap-4 rounded-xl p-4 shadow-none transition-colors duration-200 motion-reduce:transition-none sm:p-5',
        status === 'danger' && 'border-destructive/60',
        status === 'warning' && 'border-warning/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
        </h3>
        {status ? (
          <CustomSensorStatusBadge status={status} />
        ) : (
          <span className="text-xs font-medium text-muted-foreground">No reading</span>
        )}
      </div>

      <p className="flex items-baseline gap-1.5">
        <CustomReadingValue value={value} decimals={decimals} />
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>

      <CustomRangeMeter
        value={value}
        safeMin={reading.safe_min}
        safeMax={reading.safe_max}
        scaleMin={reading.scale_min}
        scaleMax={reading.scale_max}
        status={status}
      />

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{safe_label}</span>
        <span className="tabular-nums">{hasReading ? change_label : lastSeen}</span>
      </div>
    </Card>
  );
};

export default CustomSensorTile;
