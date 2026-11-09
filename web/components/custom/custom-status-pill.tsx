import { z } from 'zod';

import { cn } from '@/lib/utils';

export const statusSchema = z.enum(['running', 'paused', 'stopped', 'offline', 'active', 'invited', 'deactivated']);

export type Status = z.infer<typeof statusSchema>;

const STATUS_LOOK = {
  running: { label: 'Running', dot: 'bg-primary', text: 'text-primary' },
  active: { label: 'Active', dot: 'bg-primary', text: 'text-primary' },
  paused: { label: 'Paused', dot: 'bg-warning', text: 'text-warning' },
  invited: { label: 'Invited', dot: 'bg-info', text: 'text-info' },
  stopped: { label: 'Stopped', dot: 'bg-destructive', text: 'text-destructive' },
  offline: { label: 'Offline', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  deactivated: { label: 'Deactivated', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
} as const satisfies Record<Status, { label: string; dot: string; text: string }>;

type CustomStatusPillProps = {
  status: Status;
  className?: string;
};

const CustomStatusPill = ({ status, className }: CustomStatusPillProps) => {
  const { label, dot, text } = STATUS_LOOK[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', text, className)}>
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
};

export default CustomStatusPill;
