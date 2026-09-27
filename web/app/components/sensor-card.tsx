import React from 'react'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from './ui/card'
import type { LucideIcon } from 'lucide-react'
import { Progress } from './ui/progress'
import { toast } from 'sonner';
import { AlertTriangle, AlertCircle } from 'lucide-react'

type SensorCardProps = {
  Icon: LucideIcon
  description: string
  value: number | string,
  rangesDescription?: string,
  percentage: number
  warningRanges?: Array<[number, number]>
  dangerRanges?: Array<[number, number]>
}

type StatusType = 'normal' | 'warning' | 'danger'

const getStatus = (
  value: number | string,
  warningRanges?: Array<[number, number]>,
  dangerRanges?: Array<[number, number]>
): StatusType => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) return 'normal'
  
  // Check danger ranges first (highest priority)
  if (dangerRanges && dangerRanges.length > 0) {
    for (const [min, max] of dangerRanges) {
      if (numValue >= min && numValue <= max) {
        return 'danger'
      }
    }
  }
  
  // Check warning ranges
  if (warningRanges && warningRanges.length > 0) {
    for (const [min, max] of warningRanges) {
      if (numValue >= min && numValue <= max) {
        return 'warning'
      }
    }
  }
  
  return 'normal'
}

const SensorCard = ({Icon,description, value, rangesDescription, percentage, warningRanges, dangerRanges}: SensorCardProps) => {
  const status = getStatus(value, warningRanges, dangerRanges)
  
  const statusConfig = {
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950',
      label: 'Warning'
    },
    danger: {
      icon: AlertCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950',
      label: 'Danger'
    },
    normal: null
  }
  
  const currentStatus = status !== 'normal' ? statusConfig[status] : null
  const StatusIcon = currentStatus?.icon as LucideIcon | undefined

    // Show toast notification when status changes to warning or danger
  React.useEffect(() => {
    if (status === 'warning') {
      toast.warning(`${description} Warning`, {
        description: `Value ${value} is in the warning range`,
        position: "top-right"
      })
    } else if (status === 'danger') {
      toast.error(`${description} Danger`, {
        description: `Value ${value} is in the danger range`,
        position: "top-right"
      })
    }
  }, [status, value, description])
  
  return (
    <Card>

      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>
            <Icon />
          </CardTitle>
          {currentStatus && StatusIcon && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentStatus.bgColor}`}>
              <StatusIcon className={`w-4 h-4 ${currentStatus.color}`} />
              <span className={`text-xs font-semibold ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
          )}
        </div>
        
        <CardDescription>
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            {description}
          </h4>
          <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            {value}
          </h3>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="grid gap-6">
        <Progress value={percentage} />
      </CardContent>
      
      <CardFooter>
        {rangesDescription && (
          <p className="text-muted-foreground text-md">
            {rangesDescription}
          </p>
        )}
      </CardFooter>
    </Card>
  )
}

export default SensorCard
