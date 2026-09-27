import React from 'react'
import { useQuery } from '@tanstack/react-query';
import { getCrabLogs } from '~/api/crab';
import { DataColumns } from '~/components/data-columns';
import { DataTable } from '~/components/data-table';
import { persistor, type AppDispatch} from '~/store/store'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router';
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice'
import { useMobileNavigation } from '~/hooks/user-mobile-navigations'
import type { Crab } from '~/types/crab';

const Logs = () => {

    const { data, isLoading, error } = useQuery<Crab[]>({
        queryKey: ['crabLogs', 'all'],
        queryFn: () => getCrabLogs('all'),
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
                navigate('/access-token');
            }
    
        }, [error, dispatch, navigate, cleanup]);


    return (
        <div className="flex h-full flex-1 flex-col gap-0 rounded-xl p-4 overflow-x-auto">
            <div className="border-b border-border/40 py-5">
                <div className="max-w-7xl">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Crab Logs</h1>
                    <p className="text-muted-foreground">View and manage crab data with sorting, filtering, and pagination</p>
                </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-8">
                <div className="w-full">
                    <DataTable columns={DataColumns} data={data || []} />
                </div>
            </div>
        </div>
    )
}

export default Logs