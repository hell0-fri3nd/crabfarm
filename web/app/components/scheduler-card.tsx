import { Calendar, CalendarDays, CalendarRange, Clock, Repeat, Timer, Trash, Utensils, X } from 'lucide-react'
import React from 'react'
import { Card, CardContent } from './ui/card'
import { cn } from '~/lib/utils'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import SwitchLabel from './switch-label'
import { Button } from './ui'
import { deleteScheduler, updateScheduler } from '~/api/scheduler'
import { toast } from 'sonner'
import YesCancelDialog from './yes-cancel-dialog'

interface Schedule {
  id: number
  hour: number
  seconds: number
  is_enabled: boolean
  scheduler_type: "custom" | "daily" | "weekly" | "monthly"
  type: string
}

interface SchedulerCardProps {
  schedule: Schedule
  onToggle?: (id: number, enabled: boolean) => void
  onDelete?: (id: number) => void
}

const SchedulerCard = ({ schedule, onToggle, onDelete }: SchedulerCardProps) => {

    const [deleteDialogOpen,setDeleteDialogOpen] = React.useState(false);
    const SchedulerIcon = getSchedulerIcon(schedule.scheduler_type)
    const TypeIcon = getTypeIcon(schedule.type)
    const isCustom = schedule.scheduler_type === "custom"

    function formatTime(hour: number): string {
        const period = hour >= 12 ? "PM" : "AM"
        const displayHour = hour % 12 || 12
        return `${displayHour}:00 ${period}`
    }
    function getSchedulerIcon(type: string) {
        switch (type) {
            case "daily":
            return Calendar
            case "weekly":
            return CalendarDays
            case "monthly":
            return CalendarRange
            case "custom":
            return Timer
            default:
            return Clock
        }
    }
    function getTypeIcon(type: string) {
        switch (type.toLowerCase()) {
            case "feeding":
            return Utensils
            default:
            return Clock
        }
    }

    const handleEnableScheduler  = async (id: number, isEnabled: boolean) => {
        const {status_code,detail} = await updateScheduler({ id: id, is_enabled: isEnabled });
        const toastType = status_code === 200 ? "success" : "error";
            
        toast[toastType](detail, {
            position: "top-right",
        });
    }

    const handleDeleteScheduler = async (id: number) => {

        const { status_code, detail } = await deleteScheduler(id);
    
        setDeleteDialogOpen(false);
        const toastType = status_code === 200 ? "success" : "error";
            
        toast[toastType](detail, {
            position: "top-right",
        });
    
    }

    return (
        <div>
            <Card
            className={cn(
                "transition-all duration-200 group",
                schedule.is_enabled 
                ? "border-border" 
                : "opacity-60"
            )}>
                <CardContent className="px-4">
                    <div className="flex-1  items-start justify-between gap-4 space-y-3">

                        {/* Header row with badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className='flex flex-wrap gap-2'>
                                <Badge variant={schedule.is_enabled ? "default" : "secondary"} className="gap-1.5 capitalize">
                                    <TypeIcon className="h-3 w-3" />
                                    {schedule.type}
                                </Badge>
                                    
                                <Badge 
                                variant="outline" 
                                className={cn(
                                    "gap-1.5 capitalize",
                                    isCustom && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                )}>
                                    <SchedulerIcon className="h-3 w-3" />
                                    {schedule.scheduler_type}
                                </Badge>
                            </div>

                            {/* Delete Button */}
                            <Button 
                            variant="destructive"
                            size="icon-lg"
                            onClick={() => setDeleteDialogOpen(true)}
                            className='
                                text-muted-foreground 
                                transition-all duration-150 ease-out 
                                touch-manipulation

                                opacity-100 md:opacity-0 
                                md:group-hover:opacity-100 

                                hover:text-white hover:bg-red-600 

                                active:!text-white 
                                active:!bg-red-600 
                                active:scale-90 

                                focus:!text-white 
                                focus:!bg-red-600
                            '>
                                <Trash className="h-4 w-4" />
                            </Button>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between gap-4 px-2">

                            {/* Time display */}
                            <div className="space-y-1">
                                {isCustom ? (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
                                            <Repeat className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-semibold tracking-tight">
                                            Every {schedule.hour} {schedule.hour === 1 ? "hour" : "hours"}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                            Interval-based schedule
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                            <Clock className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-semibold tracking-tight">
                                            {formatTime(schedule.hour)}
                                            </p>
                                            <p className="text-sm text-muted-foreground capitalize">
                                            Runs {schedule.scheduler_type}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                                
                            {/* Toggle Switch */}
                            <SwitchLabel 
                            id={`scheduler-${schedule.id}`}
                            checked={Boolean(schedule.is_enabled)}
                            onCheckedChange={(checked) => handleEnableScheduler(schedule.id, checked)}
                            label={Boolean(schedule.is_enabled) ? "Active" : "Inactive"}
                            className='space-x-2'
                            />

                        </div>
                    </div>
                </CardContent>
            </Card>
            <YesCancelDialog 
            open={deleteDialogOpen} 
            onOpenChange={setDeleteDialogOpen} 
            onConfirm={() => handleDeleteScheduler(schedule.id)} 
            title="Delete Schedule" 
            description="Are you sure you want to delete this schedule?" />
        </div>               
    )
}

export default SchedulerCard
