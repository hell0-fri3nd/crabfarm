import React from 'react'
import NavFooter from '~/components/nav-footer';
import NavMain from '~/components/nav-main';
import NavUser from '~/components/nav-user';
import { 
    LayoutGrid,
    Camera,
    Logs,
    Settings,
    UserCog,
    CalendarCog,
    MonitorCheck,
    TrendingUpDown
} from 'lucide-react';

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '~/components/ui/sidebar';
import AppLogo from './app-logo';
import { Link } from 'react-router';

import type { NavItem } from '../types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/page/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Configuration',
        href: '/page/configuration',
        icon: CalendarCog,
    },
    {
        title: 'Weigh and Scan',
        href: '/page/weigh-and-scan',
        icon: Camera,
    }
];

const othersNavItems: NavItem[] = [
    {
        title: 'Crab Logs',
        href: '/page/logs',
        icon: MonitorCheck,
    },
    {
        title: 'Activity Logs',
        href: '/page/activity-logs',
        icon: Logs,
    },
    {
        title: 'Sensor Logs',
        href: '/page/sensor-logs',
        icon: TrendingUpDown,
    }
];


const footerNavItems: NavItem[] = [
    {
        title: 'User Management',
        href: '/settings/users-settings',
        icon: UserCog,
    }
];

const AppSidebar = () => {
    return (

        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link to="/page/">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} name="Main" />
                <NavMain items={othersNavItems} name="Others" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}

export default AppSidebar