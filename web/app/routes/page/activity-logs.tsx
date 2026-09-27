import React from 'react'
import { DataTable } from '~/components/data-table'
import { ActivityColumns } from '~/components/data-columns'
import { getActivityLogs } from '~/api/logs'
import type { ActivityLogs } from '~/types/activity-logs'
import { useQuery } from '@tanstack/react-query';
import { persistor, type AppDispatch} from '~/store/store'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router';
import { useMobileNavigation } from '~/hooks/user-mobile-navigations'
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice'

const ActivityLogs = () => {
    const { data, isLoading, error } = useQuery<ActivityLogs[]>({
        queryKey: ['activityLogs'],
        queryFn: () => getActivityLogs(),
        refetchInterval: 500,
        retry: false, 
    });

    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const cleanup = useMobileNavigation();
    
    React.useEffect(() => {
    
        const errStr = error as unknown as string;
        if (!error) return;
        
        if (errStr === 'MISSING_ACCESS_TOKEN') {
            dispatch(accessExpired());
            navigate('/access-token');
        }
        
        if (errStr  === 'MISSING_REFRESH_TOKEN') {
            dispatch(accessExpired());
            dispatch(refreshExpired());
            dispatch(clearAuth());
            cleanup();
            dispatch(logout());
            persistor.purge();
        }
        
    }, [error, dispatch, navigate, cleanup]);

    return (
            <div className="flex h-full flex-1 flex-col gap-0 rounded-xl p-4 overflow-x-auto">
                <div className="border-b border-border/40 py-5">
                    <div className="max-w-7xl">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Activity Logs</h1>
                        <p className="text-muted-foreground">View and manage activity data with sorting, filtering, and pagination</p>
                    </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-8">
                    <div className="w-full">
                        <DataTable 
                        columns={ActivityColumns} 
                        data={data || []} 
                        />
                    </div>
                </div>
            </div>
    )
}

export default ActivityLogs