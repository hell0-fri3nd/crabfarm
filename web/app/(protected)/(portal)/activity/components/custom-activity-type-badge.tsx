import { Bot } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import { ACTIVITY_TYPE_LABELS } from '../lib/activity-filters';

import type { ActivityType } from '../types/activity';

type CustomActivityTypeBadgeProps = {
  type: ActivityType;
};

const CustomActivityTypeBadge = ({ type }: CustomActivityTypeBadgeProps) => {
  const isAssistant = type === 'assistant';

  return (
    <Badge
      variant="secondary"
      className={cn('rounded-md px-2 py-0.5 font-semibold', isAssistant && 'bg-primary/15 text-primary')}
    >
      {isAssistant && <Bot aria-hidden />}
      {ACTIVITY_TYPE_LABELS[type]}
    </Badge>
  );
};

export default CustomActivityTypeBadge;
