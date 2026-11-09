'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDown } from 'lucide-react';

import CustomPageHeader from '@/components/custom/custom-page-header';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import CustomStatusPill from '@/components/custom/custom-status-pill';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import CustomCageGroupCard from './custom-cage-group-card';
import CustomFeedConfirmDialog from './custom-feed-confirm-dialog';
import CustomSystemControls from './custom-system-controls';
import { formatClock } from '../lib/feeding-format';

import type { Cage, CageGroup, FeedTarget, SystemState } from '../types/feeding';

type CustomFeedingBoardProps = {
  groups: CageGroup[];
  initialCages: Cage[];
  nextFeed: { time_label: string; name: string };
};

const DEVICE_CONFIRM_MS = 1500;

const toList = (codes: string[]) =>
  codes.length <= 1 ? (codes[0] ?? '') : `${codes.slice(0, -1).join(', ')} and ${codes.at(-1) ?? ''}`;

const CustomFeedingBoard = ({ groups, initialCages, nextFeed }: CustomFeedingBoardProps) => {
  const [systemState, setSystemState] = useState<SystemState>('running');
  const [cages, setCages] = useState(initialCages);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [feedTarget, setFeedTarget] = useState<FeedTarget | null>(null);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const isStopped = systemState === 'stopped';
  const nextFeedLabel = `${nextFeed.time_label} ${nextFeed.name}`;
  const scheduledCount = cages.filter(({ is_scheduled }) => is_scheduled).length;
  const jammedCodes = cages.filter(({ state }) => state === 'jammed').map(({ code }) => code);
  const targetCodes = cages.filter(({ id }) => feedTarget?.cageIds.includes(id)).map(({ code }) => code);
  const skippedCodes = feedTarget
    ? cages
        .filter(({ group_id, state }) => groups.find(({ name }) => name === feedTarget.label)?.id === group_id && state !== 'ok')
        .map(({ code }) => code)
    : [];

  const updateCage = (id: string, changes: Partial<Cage>) =>
    setCages((current) => current.map((cage) => (cage.id === id ? { ...cage, ...changes } : cage)));

  const handleScheduledChange = (cage: Cage, isScheduled: boolean) => {
    updateCage(cage.id, { is_scheduled: isScheduled });
    if (isScheduled) return;
    notify.undo(`${cage.code} left the schedules`, {
      description: "It won't be fed on a schedule until you switch it back on.",
      onUndo: () => updateCage(cage.id, { is_scheduled: true }),
    });
  };

  const handleGoToCage = (code: string) => {
    const row = document.getElementById(`cage-${code}`);
    row?.scrollIntoView({ block: 'center' });
    row?.focus({ preventScroll: true });
  };

  const handleMarkCleared = (cage: Cage) => {
    updateCage(cage.id, { state: 'ok', issue_label: null });
    notify.success(`${cage.code} cleared`, { description: `It rejoins the ${nextFeedLabel} feed.` });
  };

  const handleConfirmFeed = () => {
    if (!feedTarget) return;
    const { label, cageIds } = feedTarget;
    setFeedTarget(null);
    setPendingIds((current) => [...current, ...cageIds]);

    // Simulated dispenser confirmation; "Fed" only shows once the device reports back
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      const fedAt = formatClock(new Date());
      setCages((current) => current.map((cage) => (cageIds.includes(cage.id) ? { ...cage, last_fed_label: fedAt } : cage)));
      setPendingIds((current) => current.filter((id) => !cageIds.includes(id)));
      notify.success(`${label} fed`, {
        description: `${fedAt} · one portion${cageIds.length > 1 ? ` in each of ${cageIds.length} cages` : ''}`,
      });
    }, DEVICE_CONFIRM_MS);
    timers.current.add(timer);
  };

  const handlePause = () => {
    setSystemState('paused');
    notify.undo('Feeding paused', {
      description: 'Schedules are on hold. Feed now still works.',
      onUndo: () => setSystemState('running'),
    });
  };

  const handleResume = () => {
    setSystemState('running');
    notify.success('Feeding resumed', { description: `Next feed ${nextFeedLabel}.` });
  };

  const handleStop = () => {
    setSystemState('stopped');
    notify.warning('Feeding system stopped', { description: 'No cage is fed until you restart it.' });
  };

  const handleRestart = () => {
    setSystemState('running');
    notify.success('Feeding restarted', { description: `Next feed ${nextFeedLabel}.` });
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <CustomPageHeader
        title="Feeding"
        status={
          <>
            <CustomStatusPill status={systemState} className="text-sm" />
            <span>
              {systemState === 'running' && `Next feed ${nextFeed.time_label} · ${nextFeed.name}`}
              {systemState === 'paused' && 'Schedules on hold'}
              {isStopped && 'No feeds until you restart'}
            </span>
            <span>
              {scheduledCount} of {cages.length} cages in schedules
            </span>
          </>
        }
        actions={
          <CustomSystemControls
            state={systemState}
            nextFeedLabel={nextFeedLabel}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
            onRestart={handleRestart}
          />
        }
      />

      {jammedCodes.length > 0 && (
        <CustomSeverityAlert
          level="medium"
          title={`${toList(jammedCodes)} ${jammedCodes.length === 1 ? 'is' : 'are'} jammed`}
          description="Clear the chute, then mark the cage cleared so it rejoins the next feed."
          actions={jammedCodes.map((code) => (
            <Button
              key={code}
              type="button"
              variant="outline"
              size="sm"
              className="h-9 bg-card/60 text-foreground"
              onClick={() => handleGoToCage(code)}
            >
              <ArrowDown aria-hidden />
              Go to {code}
            </Button>
          ))}
        />
      )}

      <section aria-label="Cages by group" className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((group) => (
          <CustomCageGroupCard
            key={group.id}
            group={group}
            cages={cages.filter(({ group_id }) => group_id === group.id)}
            pendingIds={pendingIds}
            isSystemStopped={isStopped}
            onFeed={setFeedTarget}
            onMarkCleared={handleMarkCleared}
            onScheduledChange={handleScheduledChange}
          />
        ))}
      </section>

      <CustomFeedConfirmDialog
        target={feedTarget}
        cageCodes={targetCodes}
        skippedNote={
          skippedCodes.length > 0
            ? `${toList(skippedCodes)} ${skippedCodes.length === 1 ? 'is' : 'are'} skipped until ${skippedCodes.length === 1 ? 'it is' : 'they are'} working again.`
            : null
        }
        onConfirm={handleConfirmFeed}
        onCancel={() => setFeedTarget(null)}
      />
    </div>
  );
};

export default CustomFeedingBoard;
