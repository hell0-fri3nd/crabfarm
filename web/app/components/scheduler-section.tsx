import React from 'react'
import { Button } from './ui'
import { CalendarClock, Clock, X } from 'lucide-react'
import type { DispenserGroup } from '~/types/configuration';
import ScheduleModal from './modal/schedule-modal';
import { getScheduler } from '~/api/scheduler';
import { useQuery } from '@tanstack/react-query';
import type { SchedulerResponse } from '~/types/scheduler';
import SchedulerCard from './scheduler-card';
import YesCancelDialog from './yes-cancel-dialog';

// interface FeedingSchedule {
//     id: number;
//     type: 'row' | 'column';
//     groups: string[];
//     time: string;
//     portion: number;
// }

const SchedulerSection = ({groups}: { groups: DispenserGroup[] }) => {

    // const [schedules, setSchedules] = React.useState<FeedingSchedule[]>([]);
    const [openSchedule,setOpenSchedule] = React.useState(false);

    const { data, isLoading, error } = useQuery<SchedulerResponse>({
        queryKey: [],
        queryFn: () => getScheduler(),
        refetchInterval: 500,
        retry: false, 
    });

    return (
        <div>            
            <section className="space-y-6 mt-16 pt-12 border-t border-border/30">

                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h2 className="text-2xl font-semibold text-foreground">Feeding Schedules</h2>
                        <p className="text-sm text-muted-foreground">Automate feeding at specific times</p>
                    </div>
                    <Button
                    onClick={() => setOpenSchedule(true)}
                    size="lg">
                        <CalendarClock className="w-12 h-12" />
                        <span className='hidden md:inline'>Add Schedule</span>
                    </Button>
                </div>

                {/* Schedules List */}
                {!data?.data || (Array.isArray(data.data) && data.data.length === 0) ? (
                    <div className="rounded-xl border border-dashed border-border/40 p-12 text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted/40 mb-4">
                            <Clock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-foreground font-medium">No schedules yet</p>
                        <p className="text-sm text-muted-foreground mt-1">Create your first automatic feeding schedule</p>
                    </div>
                ) : (
                    <div className="grid auto-rows-min gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.isArray(data.data) && data.data.map((schedule) => (
                            <SchedulerCard schedule={schedule}  />
                        ))}
                    </div>
                )}

            </section>
            <ScheduleModal open={openSchedule} onOpenChange={setOpenSchedule} />

        </div>
    )
}

export default SchedulerSection