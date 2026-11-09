import type { ReactNode } from 'react';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CustomCardHeadingProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

const CustomCardHeading = ({ title, description, actions, className }: CustomCardHeadingProps) => (
  <CardHeader className={cn('flex flex-col gap-4 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6', className)}>
    <div className="flex min-w-0 flex-col gap-1.5">
      <CardTitle className="text-lg font-semibold tracking-tight">
        <h2>{title}</h2>
      </CardTitle>
      {description && <CardDescription className="max-w-prose">{description}</CardDescription>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">{actions}</div>}
  </CardHeader>
);

export default CustomCardHeading;
