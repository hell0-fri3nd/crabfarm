'use client';

import { useEventStream } from '@/events/use-event-stream';
import { cn } from '@/lib/utils';
import { SYSTEM_EVENT_NAMES, systemEventSchema } from '@/types/events';

import type { StreamStatus } from '@/events/use-event-stream';

const STATUS_COPY = {
  connecting: { label: 'Connecting…', dotClass: 'bg-muted-foreground', textClass: 'text-muted-foreground' },
  open: { label: 'Live', dotClass: 'bg-primary motion-safe:animate-pulse', textClass: 'text-primary' },
  reconnecting: { label: 'Reconnecting…', dotClass: 'bg-warning', textClass: 'text-warning' },
  closed: { label: 'Offline', dotClass: 'bg-destructive', textClass: 'text-destructive' },
} as const satisfies Record<StreamStatus, { label: string; dotClass: string; textClass: string }>;

const CustomLiveStatus = () => {
  const { status } = useEventStream({ path: 'events/stream', events: SYSTEM_EVENT_NAMES, schema: systemEventSchema });
  const { label, dotClass, textClass } = STATUS_COPY[status];

  return (
    <p
      role="status"
      aria-live="polite"
      className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs sm:flex"
    >
      <span aria-hidden className={cn('size-2 rounded-full', dotClass)} />
      <span className={cn('font-semibold', textClass)}>{label}</span>
    </p>
  );
};

export default CustomLiveStatus;
