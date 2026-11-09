'use client';

import { Utensils } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import CustomCageRow from './custom-cage-row';

import type { Cage, CageGroup, FeedTarget } from '../types/feeding';

type CustomCageGroupCardProps = {
  group: CageGroup;
  cages: Cage[];
  pendingIds: string[];
  isSystemStopped: boolean;
  onFeed: (target: FeedTarget) => void;
  onMarkCleared: (cage: Cage) => void;
  onScheduledChange: (cage: Cage, isScheduled: boolean) => void;
};

const CustomCageGroupCard = ({
  group,
  cages,
  pendingIds,
  isSystemStopped,
  onFeed,
  onMarkCleared,
  onScheduledChange,
}: CustomCageGroupCardProps) => {
  const scheduledCount = cages.filter(({ is_scheduled }) => is_scheduled).length;
  const problemNotes = cages
    .filter(({ state }) => state !== 'ok')
    .map(({ code, state }) => `${code} ${state === 'jammed' ? 'jammed' : 'offline'}`);
  const feedableIds = cages.filter(({ state, id }) => state === 'ok' && !pendingIds.includes(id)).map(({ id }) => id);
  const description = [`${scheduledCount} of ${cages.length} in schedules`, ...problemNotes].join(' · ');

  return (
    <Card className="gap-3 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title={group.name}
        description={description}
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-card/60"
            disabled={isSystemStopped || feedableIds.length === 0}
            onClick={() => onFeed({ label: group.name, cageIds: feedableIds })}
          >
            <Utensils aria-hidden />
            Feed group
          </Button>
        }
      />
      <CardContent className="px-4 sm:px-6">
        <div aria-hidden className="flex items-center justify-between border-b border-border pb-2 text-xs font-medium text-muted-foreground">
          <span>Cage · last fed</span>
          <span>Scheduled</span>
        </div>
        <ul className="divide-y divide-border">
          {cages.map((cage) => (
            <CustomCageRow
              key={cage.id}
              cage={cage}
              isPending={pendingIds.includes(cage.id)}
              isSystemStopped={isSystemStopped}
              onFeed={({ code, id }) => onFeed({ label: code, cageIds: [id] })}
              onMarkCleared={onMarkCleared}
              onScheduledChange={onScheduledChange}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CustomCageGroupCard;
