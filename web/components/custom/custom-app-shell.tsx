'use client';

import { useEffect } from 'react';

import type { ReactNode } from 'react';

import { useUiStore } from '@/stores/ui-store';

type CustomAppShellProps = {
  children: ReactNode;
};

const CustomAppShell = ({ children }: CustomAppShellProps) => {
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  useEffect(() => {
    void useUiStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'b' || !(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  return (
    <div data-sidebar-collapsed={String(isSidebarCollapsed)} className="flex min-h-dvh">
      {children}
    </div>
  );
};

export default CustomAppShell;
