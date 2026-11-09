import CustomSeverityBadge from '@/components/custom/custom-severity-badge';
import { Card } from '@/components/ui/card';
import { SENSOR_ICONS } from '@/lib/sensor-icons';
import { cn } from '@/lib/utils';

import CustomRangeMeter from './custom-range-meter';
import { formatReading } from '../lib/sensor-meta';

import type { SensorReading } from '../types/dashboard';

type CustomSensorTileProps = {
  reading: SensorReading;
};

const CustomSensorTile = ({ reading }: CustomSensorTileProps) => {
  const { kind, label, unit, value, decimals, severity, safe_label, change_label, last_seen_label } = reading;
  const Icon = SENSOR_ICONS[kind];
  const hasReading = value !== null;

  return (
    <Card
      className={cn(
        'gap-4 rounded-xl p-4 shadow-none sm:p-5',
        severity === 'high' && 'border-destructive/60',
        severity === 'low' && 'border-info/40',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
        </h3>
        {severity && <CustomSeverityBadge level={severity} />}
        {!severity && hasReading && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <span aria-hidden className="size-2 rounded-full bg-primary" />
            In range
          </span>
        )}
        {!hasReading && <span className="text-xs font-medium text-muted-foreground">No reading</span>}
      </div>

      <p className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          {hasReading ? formatReading(value, decimals) : '—'}
        </span>
        {unit && <span className="text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>

      <CustomRangeMeter
        value={value}
        safeMin={reading.safe_min}
        safeMax={reading.safe_max}
        scaleMin={reading.scale_min}
        scaleMax={reading.scale_max}
        isOutOfRange={severity === 'high'}
      />

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{safe_label}</span>
        <span className="tabular-nums">{hasReading ? change_label : `Last seen ${last_seen_label ?? 'unknown'}`}</span>
      </div>
    </Card>
  );
};

export default CustomSensorTile;
