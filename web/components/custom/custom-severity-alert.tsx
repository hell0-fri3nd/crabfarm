import type { ReactNode } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

import CustomSeverityBadge, { SEVERITY_LOOK } from '@/components/custom/custom-severity-badge';
import type { Severity } from '@/types/severity';

const ALERT_TINT = {
  high: 'border-destructive/50 bg-destructive/10 [&>svg]:text-destructive',
  medium: 'border-warning/50 bg-warning/10 [&>svg]:text-warning',
  low: 'border-info/40 bg-card [&>svg]:text-info',
} as const satisfies Record<Severity, string>;

type CustomSeverityAlertProps = {
  level: Severity;
  title: string;
  description: string;
  badgeLabel?: string;
  actions?: ReactNode;
  className?: string;
};

const CustomSeverityAlert = ({ level, title, description, badgeLabel, actions, className }: CustomSeverityAlertProps) => {
  const { icon: Icon } = SEVERITY_LOOK[level];

  return (
    <Alert
      role="status"
      className={cn('rounded-xl px-4 py-4 text-foreground sm:px-6 sm:py-5', ALERT_TINT[level], className)}
    >
      <Icon aria-hidden />
      <AlertTitle className="flex flex-wrap items-center gap-2 font-semibold">
        <CustomSeverityBadge level={level} label={badgeLabel} />
        {title}
      </AlertTitle>
      <AlertDescription className="flex h-full flex-col text-muted-foreground">
        <p>{description}</p>
        {actions && <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">{actions}</div>}
      </AlertDescription>
    </Alert>
  );
};

export default CustomSeverityAlert;
