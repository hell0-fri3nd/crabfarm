import React from 'react'
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '~/components/ui/dropdown-menu';
import UserInfo from '~/components/user-info';
import { useMobileNavigation } from '../hooks/user-mobile-navigations';
import type { User } from '../types';
import { Link } from 'react-router';
import { LogOut, Settings } from 'lucide-react';

import { useDispatch } from 'react-redux';
import { logout, clearAuth, accessExpired, refreshExpired } from '../store/auth/auth-slice';
import { persistor, type AppDispatch } from '../store/store';

interface UserMenuContentProps {
    user: User;
}

const UserMenuContent = ({ user }: UserMenuContentProps) => {
    const cleanup = useMobileNavigation();
    const dispatch = useDispatch<AppDispatch>(); 


    const handleLogout = async () => {
        try {
            cleanup();
            await dispatch(logout()).unwrap();
            dispatch(accessExpired());
            dispatch(refreshExpired());
            dispatch(clearAuth());
            persistor.purge();
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full" to="/settings/account-settings" onClick={cleanup}>
                        <Settings className="mr-2" />
                        Account Settings
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full" to="/" onClick={handleLogout}>
                    <LogOut className="mr-2" />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    )
}

export default UserMenuContent