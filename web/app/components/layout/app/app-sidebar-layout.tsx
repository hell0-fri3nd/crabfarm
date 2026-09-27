import React from 'react'
import type { BreadcrumbItem } from'../../../types';
import type { PropsWithChildren } from 'react';
import AppShell from '~/components/app-shell';
import AppSidebar from '~/components/app-sidebar';
import AppContent from '~/components/app-content';
import AppSidebarHeader from '~/components/app-sidebar-header';

const AppSidebarLayout = ({children, breadcrumbs = []}: PropsWithChildren & {breadcrumbs?: BreadcrumbItem[]}) => {
  return (
    <AppShell variant="sidebar">
      <AppSidebar />
        <AppContent variant="sidebar" className="overflow-x-hidden">
          <AppSidebarHeader breadcrumbs={breadcrumbs} />
            {children}
        </AppContent>
    </AppShell>
  )
}

export default AppSidebarLayout