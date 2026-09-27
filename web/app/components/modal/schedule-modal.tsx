import React from 'react'
import { Button, Input, Label } from '../ui'
import { DialogTitle,Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogClose } from '../ui/dialog'
import SelectDropdown from '../select-dropdown'
import { postScheduler } from '~/api/scheduler'
import { toast } from 'sonner'
import { Spinner } from '../ui/spinner'

const ScheduleModal = ({open, onOpenChange} : {open: boolean, onOpenChange: (open: boolean) => void}) => {

    const AM_PM = [
      { index: 1, label: "AM", value: "AM" },
      { index: 2, label: "PM", value: "PM" }
    ]

    const type = [
        { index: 1, label: "feeding", value: "feeding" }
    ]

    const frequently = [
      { index: 1, label: "daily", value: "daily" },
      { index: 2, label: "weekly", value: "weekly" },
      { index: 3, label: "monthly", value: "monthly" },
      { index: 4, label: "custom", value: "custom" }
    ]

    const [am_pm,setAm_pm] = React.useState({
      hour: 1,
      am_pm: 'AM'
    });

    const [schedulerType,setSchedulerType] = React.useState('daily')
    const [statusButton,setStatusButton] = React.useState(false)
    const createScheduler = async () => {

      const to24Hour = am_pm.am_pm === 'PM' ? Number(am_pm.hour) + 12 : am_pm.hour;
      setStatusButton(true);
      const { status_code, detail } = await postScheduler(
        { 
          type: "feeding", 
          scheduler_type: schedulerType, 
          hour: to24Hour, 
          seconds: 0, 
          is_enabled: true
        }
      );
      
      const toastType =
        status_code === 201
          ? "success"
          : status_code === 200
          ? "warning"
          : "error";

      toast[toastType](detail ?? "Failed to generate prediction", {
        position: "top-right",
      });

      onOpenChange(false);
      setStatusButton(false);
    }
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Feeding Schedule</DialogTitle>
            <DialogDescription>
            Create an automated feeding schedule
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">

            <SelectDropdown
            label="Type"
            placeholder="Select type"
            options={type}
            value={'feeding'}/>

            <SelectDropdown
            label="Frequency"
            placeholder="Select frequency"
            options={frequently}
            value={schedulerType}
            onValueChange={(value)=>setSchedulerType(value ?? "daily")}/>

            <div className="flex gap-4">
              <div className="w-7/10">
                <Input 
                type="number" placeholder="Hour" className="mb-2" 
                value={am_pm.hour}
                onChange={e=>setAm_pm({...am_pm, hour: Number(e.target.value) ?? 1})}/>
              </div>
              <div className="w-3/10">
                <SelectDropdown
                  label=""
                  placeholder="Select frequency"
                  options={AM_PM}
                  value={am_pm.am_pm}
                  onValueChange={(value)=>setAm_pm({...am_pm, am_pm: value ?? 'AM'})}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="lg" >Cancel</Button>
            </DialogClose>
            <Button size="lg" onClick={createScheduler} disabled={statusButton}>
              { 
                statusButton ? 
                <Spinner /> : 
                <span>Create Schedule</span>
              }
            </Button>
          </DialogFooter>

        </DialogContent>

      </Dialog>
    )
}

export default ScheduleModal