'use client';

import { Utensils } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import type { Cage } from '../types/feeding';

type CustomCageRowProps = {
  cage: Cage;
  fedLabel: string | undefined;
  isFeeding: boolean;
  isSaving: boolean;
  onFeed: (cage: Cage) => void;
  onActiveChange: (cage: Cage, isActive: boolean) => void;
};

const toStatusLabel = ({ is_active }: Cage, fedLabel: string | undefined, isFeeding: boolean) => {
  if (isFeeding) return 'Feeding…';
  if (fedLabel) return `Fed ${fedLabel}`;
  return is_active ? 'In schedules' : 'Not in schedules';
};

const CustomCageRow = ({ cage, fedLabel, isFeeding, isSaving, onFeed, onActiveChange }: CustomCageRowProps) => {
  const statusId = `cage-${cage.id}-status`;

  return (
    <li className="flex items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{cage.cage_name}</p>
        <p id={statusId} className="truncate text-xs text-muted-foreground">
          {toStatusLabel(cage, fedLabel, isFeeding)}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        className="h-11 px-3 text-muted-foreground hover:text-foreground"
        disabled={isFeeding}
        aria-describedby={statusId}
        onClick={() => onFeed(cage)}
      >
        <Utensils aria-hidden />
        {isFeeding ? 'Feeding…' : 'Feed now'}
      </Button>

      <Switch
        checked={cage.is_active}
        disabled={isSaving}
        onCheckedChange={(isChecked) => onActiveChange(cage, isChecked)}
        aria-label={`Include ${cage.cage_name} in schedules`}
        className="relative ml-1 h-6 w-11 after:absolute after:-inset-2.5 [&>span]:size-5"
      />
    </li>
  );
};

export default CustomCageRow;
