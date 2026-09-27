import React from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '~/components/ui/sidebar';
import UserInfo from './user-info';
import UserMenuContent from './user-menu-content';
import { useIsMobile } from '../hooks/use-mobile';
// import { type SharedData } from '../types/index';
// import { useLocation } from 'react-router';
import { ChevronsUpDown } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const NavUser = () => {

    const { user } = useSelector((state: RootState) => state.auth);

    const auth = {
        user: {
            name: user?.user,
            email: user?.email || '',
            avatar: "",
            email_verified_at: true,
            created_at: '',
            updated_at: ''
        }
    }
    const { state } = useSidebar();
    const isMobile = useIsMobile();
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton size="lg" className="group text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent">
                            <UserInfo user={auth.user}/>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                        align="end"
                        side={isMobile ? 'bottom' : state === 'collapsed' ? 'left' : 'bottom'}
                    >
                        <UserMenuContent user={auth.user}/>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}

export default NavUser