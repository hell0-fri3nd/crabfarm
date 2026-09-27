import React from 'react'

import { SidebarProvider } from '../components/ui/sidebar';
import  type { SharedData } from '../types/index';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

const AppShell = ({ children, variant = 'header' }: AppShellProps) => {
    const isOpen = true;
    
    if (variant === 'header') {
        return <div className="flex min-h-screen w-full flex-col">{children}</div>;
    }

    return <SidebarProvider defaultOpen={isOpen}>{children}</SidebarProvider>;
}

export default AppShell