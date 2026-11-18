'use client';

import { toDeviceSummary } from '@/lib/device-status';
import { cn } from '@/lib/utils';
import { useDeviceStatusStore } from '@/stores/device-status-store';

import type { DeviceSummaryTone } from '@/lib/device-status';

const TONE_LOOK = {
  muted: { dotClass: 'bg-muted-foreground', textClass: 'text-muted-foreground' },
  connected: { dotClass: 'bg-primary motion-safe:animate-pulse', textClass: 'text-primary' },
  warning: { dotClass: 'bg-warning', textClass: 'text-warning' },
  danger: { dotClass: 'bg-destructive', textClass: 'text-destructive' },
} as const satisfies Record<DeviceSummaryTone, { dotClass: string; textClass: string }>;

const CustomLiveStatus = () => {
  const status = useDeviceStatusStore((state) => state.status);
  const connections = useDeviceStatusStore((state) => state.connections);
  const { label, tone } = toDeviceSummary(status, connections);
  const { dotClass, textClass } = TONE_LOOK[tone];

  return (
    <p
      role="status"
      aria-live="polite"
      className="hidden min-w-0 items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs sm:flex"
    >
      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', dotClass)} />
      <span className={cn('truncate font-semibold', textClass)}>{label}</span>
    </p>
  );
};

export default CustomLiveStatus;
