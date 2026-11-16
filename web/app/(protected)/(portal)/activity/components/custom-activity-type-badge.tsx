import { Badge } from '@/components/ui/badge';

import { ACTIVITY_TYPE_LABELS } from '../lib/activity-labels';

import type { ActivityType } from '../types/activity';

type CustomActivityTypeBadgeProps = {
  type: ActivityType;
};

const CustomActivityTypeBadge = ({ type }: CustomActivityTypeBadgeProps) => (
  <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-semibold">
    {ACTIVITY_TYPE_LABELS[type]}
  </Badge>
);

export default CustomActivityTypeBadge;
