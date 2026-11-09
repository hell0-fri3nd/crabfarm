import type { ReactNode } from 'react';

import CustomBrandLogo from '@/components/custom/custom-brand-logo';
import CustomBubbles from '@/components/custom/custom-bubbles';

type CustomAuthShellProps = {
  headerEnd?: ReactNode;
  children: ReactNode;
};

const CustomAuthShell = ({ headerEnd, children }: CustomAuthShellProps) => (
  <div className="relative isolate flex min-h-dvh flex-col">
    <CustomBubbles />
    <header className="flex h-16 items-center justify-between px-4 md:px-8">
      <CustomBrandLogo height={28} />
      {headerEnd}
    </header>
    {children}
  </div>
);

export default CustomAuthShell;
