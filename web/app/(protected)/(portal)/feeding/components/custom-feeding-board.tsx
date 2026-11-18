'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleX } from 'lucide-react';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Card } from '@/components/ui/card';
import { notify } from '@/lib/notify';

import CustomCageGroupCard from './custom-cage-group-card';
import CustomFeedConfirmDialog from './custom-feed-confirm-dialog';
import { setCageActive } from '../actions/set-cage-active';
import { formatClock, toCageGroups } from '../lib/feeding-format';

import type { Cage, FeedTarget } from '../types/feeding';

type CustomFeedingBoardProps = {
  initialCages: Cage[];
};

const DEVICE_CONFIRM_MS = 1500;

const CustomFeedingBoard = ({ initialCages }: CustomFeedingBoardProps) => {
  const [cages, setCages] = useState(initialCages);
  const [feedingIds, setFeedingIds] = useState<string[]>([]);
  const [savingIds, setSavingIds] = useState<string[]>([]);
  const [fedLabels, setFedLabels] = useState<Record<string, string>>({});
  const [feedTarget, setFeedTarget] = useState<FeedTarget | null>(null);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const groups = toCageGroups(cages);
  const scheduledCount = cages.filter(({ is_active }) => is_active).length;
  const targetNames = cages.filter(({ id }) => feedTarget?.cageIds.includes(id)).map(({ cage_name }) => cage_name);

  const replaceCage = (cage: Cage) => setCages((current) => current.map((item) => (item.id === cage.id ? cage : item)));

  const handleActiveChange = async (cage: Cage, isActive: boolean) => {
    replaceCage({ ...cage, is_active: isActive });
    setSavingIds((current) => [...current, cage.id]);
    const result = await setCageActive({ id: cage.id, is_active: isActive });
    setSavingIds((current) => current.filter((id) => id !== cage.id));

    if (!result.ok) {
      replaceCage(cage);
      notify.error(`Couldn't update ${cage.cage_name}`, { description: result.message });
      return;
    }

    replaceCage(result.data);
    if (isActive) {
      notify.success(`${cage.cage_name} is back in the schedules`);
      return;
    }
    notify.undo(`${cage.cage_name} left the schedules`, {
      description: "It won't be fed on a schedule until you switch it back on.",
      onUndo: () => void handleActiveChange(result.data, true),
    });
  };

  const handleConfirmFeed = () => {
    if (!feedTarget) return;
    const { label, cageIds } = feedTarget;
    setFeedTarget(null);
    setFeedingIds((current) => [...current, ...cageIds]);

    // Simulated dispenser confirmation; "Fed" only shows once the device reports back
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      const fedAt = formatClock(new Date());
      setFedLabels((current) => ({ ...current, ...Object.fromEntries(cageIds.map((id) => [id, fedAt])) }));
      setFeedingIds((current) => current.filter((id) => !cageIds.includes(id)));
      notify.success(`${label} fed`, {
        description: `${fedAt} · one portion${cageIds.length > 1 ? ` in each of ${cageIds.length} cages` : ''}`,
      });
    }, DEVICE_CONFIRM_MS);
    timers.current.add(timer);
  };

  return (
    <div className="flex w-full flex-col gap-8">
      <CustomPageHeader
        title="Feeding"
        status={
          <span>
            {scheduledCount} of {cages.length} cages in schedules
          </span>
        }
      />

      {cages.length === 0 ? (
        <Card className="py-0">
          <CustomEmptyState icon={CircleX} title="No cages yet" hint="Cages appear here once they are added to the farm." />
        </Card>
      ) : (
        <section aria-label="Cages by group" className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <CustomCageGroupCard
              key={group.id}
              group={group}
              cages={cages.filter(({ group_code }) => group_code === group.id)}
              feedingIds={feedingIds}
              savingIds={savingIds}
              fedLabels={fedLabels}
              onFeed={setFeedTarget}
              onActiveChange={(cage, isActive) => void handleActiveChange(cage, isActive)}
            />
          ))}
        </section>
      )}

      <CustomFeedConfirmDialog
        target={feedTarget}
        cageNames={targetNames}
        onConfirm={handleConfirmFeed}
        onCancel={() => setFeedTarget(null)}
      />
    </div>
  );
};

export default CustomFeedingBoard;
