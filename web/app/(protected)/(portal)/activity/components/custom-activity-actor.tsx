import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

import { toActorInitials, toActorLabel } from '../lib/activity-filters';

import type { ActivityEntry } from '../types/activity';

type CustomActivityActorProps = {
  entry: ActivityEntry;
};

const CustomActivityActor = ({ entry }: CustomActivityActorProps) => (
  <span className="flex min-w-0 items-center gap-2.5">
    <Avatar className="size-7">
      <AvatarFallback
        className={cn(
          'text-xs font-bold',
          entry.actor_kind === 'person' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
        )}
      >
        {toActorInitials(entry)}
      </AvatarFallback>
    </Avatar>
    <span className="min-w-0 text-sm font-medium">{toActorLabel(entry)}</span>
  </span>
);

export default CustomActivityActor;
