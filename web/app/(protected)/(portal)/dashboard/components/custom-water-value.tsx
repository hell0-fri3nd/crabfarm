import { OctagonAlert, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SENSOR_STATUS_LABELS } from '@/types/sensor';

import { formatReading } from '../lib/sensor-meta';

import type { SensorReading } from '../types/dashboard';

type CustomWaterValueProps = {
  reading: SensorReading;
  className?: string;
};

const ALERT_LOOK = {
  warning: { icon: TriangleAlert, className: 'font-semibold text-warning' },
  danger: { icon: OctagonAlert, className: 'font-semibold text-destructive' },
} as const;

const CustomWaterValue = ({ reading: { value, decimals, status }, className }: CustomWaterValueProps) => {
  const alert = status === 'warning' || status === 'danger' ? { status, ...ALERT_LOOK[status] } : null;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1 tabular-nums', alert?.className, className)}>
      {value === null ? '—' : formatReading(value, decimals)}
      {alert && (
        <>
          <alert.icon className="size-3.5" aria-hidden />
          <span className="text-xs">{SENSOR_STATUS_LABELS[alert.status]}</span>
        </>
      )}
    </span>
  );
};

export default CustomWaterValue;
