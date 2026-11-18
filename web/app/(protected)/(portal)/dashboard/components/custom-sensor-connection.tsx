import { Droplets, Unplug, WifiOff } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

import type { SensorConnection } from '../lib/water-sensors';

type CustomSensorConnectionProps = {
  connection: SensorConnection;
};

const CONNECTION_COPY = {
  checking: { label: 'Checking sensors…', icon: Droplets, dotClass: 'bg-muted-foreground', textClass: 'text-muted-foreground' },
  connected: { label: 'Sensors connected', icon: Droplets, dotClass: 'bg-primary motion-safe:animate-pulse', textClass: 'text-primary' },
  disconnected: { label: 'Sensors not connected', icon: Unplug, dotClass: 'bg-warning', textClass: 'text-warning' },
  offline: { label: 'Live feed offline', icon: WifiOff, dotClass: 'bg-destructive', textClass: 'text-destructive' },
} as const satisfies Record<SensorConnection, { label: string; icon: LucideIcon; dotClass: string; textClass: string }>;

const CustomSensorConnection = ({ connection }: CustomSensorConnectionProps) => {
  const { label, icon: Icon, dotClass, textClass } = CONNECTION_COPY[connection];

  return (
    <p className="flex w-fit items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs">
      <span aria-hidden className={cn('size-2 rounded-full', dotClass)} />
      <span className={cn('flex items-center gap-1.5 font-semibold', textClass)}>
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
    </p>
  );
};

export default CustomSensorConnection;
