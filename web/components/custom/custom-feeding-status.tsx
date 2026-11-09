import Link from 'next/link';

import { cn } from '@/lib/utils';

import type { ComponentProps } from 'react';

type CustomFeedingStatusProps = Omit<ComponentProps<typeof Link>, 'href' | 'children'> & {
  isOn: boolean;
  nextFeedLabel: string;
};

const CustomFeedingStatus = ({ isOn, nextFeedLabel, className, ...props }: CustomFeedingStatusProps) => (
  <Link
    {...props}
    href="/feeding"
    className={cn(
      'mx-auto flex size-12 items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent',
      'sidebar-full:mx-0 sidebar-full:size-auto sidebar-full:justify-start sidebar-full:gap-3 sidebar-full:border sidebar-full:border-sidebar-border sidebar-full:px-3 sidebar-full:py-2.5',
      className,
    )}
  >
    <span
      aria-hidden
      className={cn(
        'size-2.5 shrink-0 rounded-full ring-4',
        isOn ? 'bg-sidebar-primary ring-sidebar-primary/20' : 'bg-sidebar-foreground/40 ring-sidebar-foreground/10',
      )}
    />
    <span className="sr-only sidebar-full:not-sr-only sidebar-full:flex sidebar-full:min-w-0 sidebar-full:flex-col">
      <span className="text-sm font-semibold">{isOn ? 'Feeding on' : 'Feeding off'}</span>
      <span className="text-xs text-sidebar-foreground/70">Next feed {nextFeedLabel}</span>
    </span>
  </Link>
);

export default CustomFeedingStatus;
