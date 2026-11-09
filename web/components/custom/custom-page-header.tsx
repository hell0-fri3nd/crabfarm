import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CustomPageHeaderProps = {
  title: string;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

const CustomPageHeader = ({ title, status, actions, className }: CustomPageHeaderProps) => (
  <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
    <div className="flex min-w-0 flex-col gap-2">
      <h1 className="text-3xl font-bold">{title}</h1>
      {status && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">{status}</div>}
    </div>
    {actions && (
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
        {actions}
      </div>
    )}
  </header>
);

export default CustomPageHeader;
