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
  feedingIds: string[];
  savingIds: string[];
  fedLabels: Record<string, string>;
  onFeed: (target: FeedTarget) => void;
  onActiveChange: (cage: Cage, isActive: boolean) => void;
};

const CustomCageGroupCard = ({
  group,
  cages,
  feedingIds,
  savingIds,
  fedLabels,
  onFeed,
  onActiveChange,
}: CustomCageGroupCardProps) => {
  const scheduledCount = cages.filter(({ is_active }) => is_active).length;
  const feedableIds = cages.filter(({ id }) => !feedingIds.includes(id)).map(({ id }) => id);

  return (
    <Card className="gap-3 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title={group.name}
        description={`${scheduledCount} of ${cages.length} in schedules`}
        actions={
          <Button
            type="button"
            variant="outline"
            className="h-11 bg-card/60"
            disabled={feedableIds.length === 0}
            onClick={() => onFeed({ label: group.name, cageIds: feedableIds })}
          >
            <Utensils aria-hidden />
            Feed group
          </Button>
        }
      />
      <CardContent className="px-4 sm:px-6">
        <div aria-hidden className="flex items-center justify-between border-b border-border pb-2 text-xs font-medium text-muted-foreground">
          <span>Cage</span>
          <span>Scheduled</span>
        </div>
        <ul className="divide-y divide-border">
          {cages.map((cage) => (
            <CustomCageRow
              key={cage.id}
              cage={cage}
              fedLabel={fedLabels[cage.id]}
              isFeeding={feedingIds.includes(cage.id)}
              isSaving={savingIds.includes(cage.id)}
              onFeed={({ cage_name, id }) => onFeed({ label: cage_name, cageIds: [id] })}
              onActiveChange={onActiveChange}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default CustomCageGroupCard;
