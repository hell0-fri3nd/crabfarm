import { Info, OctagonAlert, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

import type { Severity } from '@/types/severity';

type SeverityLook = {
  label: string;
  icon: LucideIcon;
  className: string;
};

export const SEVERITY_LOOK = {
  high: { label: 'High', icon: OctagonAlert, className: 'border-destructive bg-destructive text-white' },
  medium: { label: 'Medium', icon: TriangleAlert, className: 'border-warning/40 bg-warning/15 text-warning' },
  low: { label: 'Low', icon: Info, className: 'border-info/60 bg-transparent text-info' },
} as const satisfies Record<Severity, SeverityLook>;

type CustomSeverityBadgeProps = {
  level: Severity;
  className?: string;
};

const CustomSeverityBadge = ({ level, className }: CustomSeverityBadgeProps) => {
  const { label, icon: Icon, className: lookClassName } = SEVERITY_LOOK[level];

  return (
    <Badge variant="outline" className={cn('gap-1 px-2 py-0.5 font-semibold', lookClassName, className)}>
      <Icon aria-hidden />
      {label}
    </Badge>
  );
};

export default CustomSeverityBadge;
