import AppSidebarLayout from './app/app-sidebar-layout'
import type { BreadcrumbItem } from '../../types/';
import type { ReactNode } from 'react';

interface AppLayoutProps { 
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

const AppLayout = ({ children, breadcrumbs, ...props }: AppLayoutProps) => {
    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs} {...props}>
            {children}
        </AppSidebarLayout>
    )
}

export default AppLayout