import React from 'react';
import CardFeeder from '~/components/card-feeder';
import ControlButtons from '~/components/control-buttons';
import SwitchLabel from '~/components/switch-label';
import { useQuery } from '@tanstack/react-query';
import { getDispensers, setDispensers } from '~/api/control';
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import { useMobileNavigation } from '~/hooks/user-mobile-navigations';
import { persistor, type store, type AppDispatch } from '~/store/store';
import { toast } from 'sonner';
import SchedulerSection from '~/components/scheduler-section';


interface dispensers {
    states: []
}

const Configuration = () => {
    const groupBy = [
        { index: 1, label: "A", value: [1,2,3,4,5]},
        { index: 2, label: "B", value: [6,7,8,9,10]},
        { index: 3, label: "C", value: [11,12,13,14,15]},
        { index: 4, label: "D", value: [16,17,18,19,20]},
        { index: 5, label: "E", value: [21,22,23,24,25]}
    ]
    const [localData, setLocalData] = React.useState<boolean[]>([]);

    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const cleanup = useMobileNavigation();
    

    const { data, isLoading, error } = useQuery<dispensers>({
        queryKey: [],
        queryFn: () => getDispensers(),
        refetchInterval: 500,
        retry: false, 
    });

    React.useEffect(() => {
        if (!data?.states || error) return;

        setLocalData((prev) => {
            // merge backend changes
            const updated = [...prev];
            data.states.forEach((value, i) => {
            if (updated[i] !== value) {
                updated[i] = value; // only overwrite if different
            }
            });
            return updated;
        });
    }, []);

    React.useEffect(() => {

        const errStr = error as unknown as string;

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

    const handleToggle = async (index: number) => {

        try {
                  
            setLocalData((prev) => {
                const updated = [...prev];
                updated[index] = !updated[index];
                return updated;
            });

            const { status_code, detail } = await setDispensers(Number(index));
            const toastType = status_code === 200 ? "success" : "warning";

            toast[toastType](detail?.success ? `Dispenser ${!Boolean(localData[index]) ? 'Turn On' : 'Turn Off'}: ${index}` : `Failed to set dispenser ${index}`, {
                position: "top-right",
            });
           
            
        } catch (error: any) {
            toast.error(
                error?.detail ?? "Something went wrong",
                { position: "top-right" }
            );
        }
    };
    return (
        <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">

            <div className="border-b border-border/40 py-5">
                <div className="max-w-7xl">
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuration</h1>
                    <p className="text-muted-foreground">Manage your feeding dispensers in real-time</p>
                </div>
            </div>

            <ControlButtons />

            <div className="grid auto-rows-min gap-2 md:grid-cols-3">
                {groupBy.map((data) => (
                    <CardFeeder key= {data.index} title={`Group ${data.label}`} description={`${data.value.length} dispensers`}>
                        <div className="flex flex-col gap-1">
                             {data.value.map((value,key) => 
                             (
                                <SwitchLabel 
                                key={key} 
                                id={`feed-${data.index}-${value}`} 
                                label={`Feed ${data.label}${key+1}`} 
                                checked={!Boolean(localData[value - 1])}
                                onCheckedChange={(checked) => handleToggle(value - 1)}
                                className="p-4 rounded-lg border border-border/30 hover:border-border/60 transition-colors bg-card/50"
                                />
                            ))}
                        </div>
                    </CardFeeder>
                )
                )}
            </div>

            <SchedulerSection groups={groupBy} />

        </div>
    )
}

export default Configuration