import React from 'react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select'
import { Label} from './ui'

interface SelectOption {
    index: number
    label: string
    value: string
}

interface SelectDropdownProps {
    label?: string
    placeholder?: string
    options: SelectOption[]
    value?: string
    onValueChange?: (value: string | null) => void
    groupLabel?: string
    className?: string
}

const SelectDropdown = ({  
        label,
        placeholder = "Select option",
        options,
        value,
        onValueChange,
        groupLabel,
        className = "w-full"
    } : SelectDropdownProps) => {
    return (
        <div className="space-y-2"> 
            {label && (
                <Label className="text-xs font-medium tracking-wide text-muted-foreground">
                {label}
                </Label>
            )}

            <Select value={value} onValueChange={onValueChange}>
                <SelectTrigger className={className}>
                <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                <SelectGroup>
                    {groupLabel && <SelectLabel>{groupLabel}</SelectLabel>}
                    {options.map((option) => (
                    <SelectItem key={option.index} value={option.value}>
                        {option.label}
                    </SelectItem>
                    ))}
                </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    )
}

export default SelectDropdown