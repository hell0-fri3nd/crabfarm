import {  Label } from '~/components/ui';
import { Switch } from '~/components/ui/switch';
import { cn } from '~/lib/utils';

type SwitchLabelProps = {
  id: string
  label: string
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

const SwitchLabel = ({ id, label, checked, onCheckedChange, className }: SwitchLabelProps) => {
    return (
        <div className={cn("flex items-center justify-between", className)}>
            <Label htmlFor={id}> {label} </Label>
            <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    )
}

export default SwitchLabel