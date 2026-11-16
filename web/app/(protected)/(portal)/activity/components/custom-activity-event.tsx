import { CircleX, ShieldAlert } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import type { ActivityEntry } from '../types/activity';

type CustomActivityEventProps = {
  entry: ActivityEntry;
};

const CustomActivityEvent = ({ entry: { outcome, outcome_label, event, count } }: CustomActivityEventProps) => {
  const Icon = outcome === 'DENIED' ? ShieldAlert : CircleX;

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {outcome_label && (
        <Badge variant="outline" className="rounded-md border-destructive/50 px-2 py-0.5 font-semibold text-destructive">
          <Icon aria-hidden />
          {outcome_label}
        </Badge>
      )}
      <span>{event}</span>
      {count > 1 && <span className="text-sm font-normal text-muted-foreground tabular-nums">{count} times</span>}
    </span>
  );
};

export default CustomActivityEvent;
