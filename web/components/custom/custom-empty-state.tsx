import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CustomEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: ReactNode;
  className?: string;
};

const CustomEmptyState = ({ icon: Icon, title, hint, action, className }: CustomEmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-3 px-4 py-12 text-center', className)}>
    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Icon className="size-5" aria-hidden />
    </span>
    <p className="text-base font-semibold">{title}</p>
    <p className="max-w-sm text-sm text-muted-foreground">{hint}</p>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

export default CustomEmptyState;
