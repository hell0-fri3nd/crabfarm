import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { version } from '@/package.json';

type CustomFooterProps = {
  children?: ReactNode;
  variant?: 'centered' | 'split';
  className?: string;
};

const [major, minor] = version.split('.');
const APP_VERSION = `v${major}.${minor}`;
const CREDIT = 'Built by Art Lisboa';

const CustomFooter = ({ children, variant = 'centered', className }: CustomFooterProps) => {
  if (variant === 'split') {
    return (
      <footer
        className={cn(
          'flex items-center justify-between gap-4 border-t border-border px-4 py-5 text-xs text-muted-foreground md:px-8',
          className,
        )}
      >
        <span>CrabFarm {APP_VERSION}</span>
        <span>{CREDIT}</span>
      </footer>
    );
  }

  return (
    <footer className={cn('px-4 py-6 text-center text-sm text-muted-foreground', className)}>
      {children ?? `CrabFarm ${APP_VERSION} · ${CREDIT}`}
    </footer>
  );
};

export default CustomFooter;
