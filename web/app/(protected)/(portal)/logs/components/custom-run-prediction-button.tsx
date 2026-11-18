'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import CustomOldLogsForecastDialog from './custom-old-logs-forecast-dialog';
import { checkForecastReadiness } from '../actions/check-forecast-readiness';
import { runPrediction } from '../actions/run-prediction';

import type { OldLogsWarning } from './custom-old-logs-forecast-dialog';
import type { ForecastReadiness, PredictionOutcome } from '../types/forecast';

type CustomRunPredictionButtonProps = {
  disabledReasonId?: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const crabs = (count: number) => `${count} ${count === 1 ? 'crab' : 'crabs'}`;

const describeLeftOut = ({ skipped, alreadyPredicted }: { skipped: number; alreadyPredicted: number }) =>
  [
    alreadyPredicted > 0 && `${crabs(alreadyPredicted)} already forecast`,
    skipped > 0 && `${crabs(skipped)} without enough logged days`,
  ]
    .filter(Boolean)
    .join(', ');

const toOldLogsWarning = (readiness: ForecastReadiness): OldLogsWarning => ({
  readiness,
  newestAgeDays: readiness.newest_last_log
    ? Math.max(Math.floor((Date.now() - new Date(`${readiness.newest_last_log}T00:00:00Z`).getTime()) / DAY_MS), 0)
    : 0,
});

const announceOutcome = (outcome: PredictionOutcome) => {
  if (outcome.kind === 'up-to-date') {
    notify.info('Forecasts are up to date', {
      description: 'Every crab already has a forecast for the coming days. Run it again after those days pass.',
    });
    return;
  }

  if (outcome.kind === 'not-enough-logs') {
    notify.warning('No crab has enough logs to forecast yet', {
      description: 'A crab needs its width and weight logged on at least 7 days. Nothing was saved.',
    });
    return;
  }

  const leftOut = describeLeftOut(outcome);
  const oldLogsNote = outcome.fromOldLogs > 0 ? ` ${crabs(outcome.fromOldLogs)} used old logs, so treat those as rough.` : '';
  notify.success(`7-day forecast ready for ${crabs(outcome.predicted)}`, {
    description: `They show as the dashed Forecast line on the chart.${oldLogsNote}${leftOut ? ` ${leftOut}.` : ''}`,
  });
};

const CustomRunPredictionButton = ({ disabledReasonId }: CustomRunPredictionButtonProps) => {
  const router = useRouter();
  const [isRunning, startRun] = useTransition();
  const [warning, setWarning] = useState<OldLogsWarning | null>(null);

  const forecast = async (includeOldLogs: boolean) => {
    const result = await runPrediction({ includeOldLogs });
    if (!result.ok) {
      notify.error("Couldn't forecast growth", { description: `${result.message} Nothing was saved.` });
      return;
    }

    announceOutcome(result.data);
    if (result.data.kind === 'created') router.refresh();
  };

  const handleRun = () =>
    startRun(async () => {
      const readiness = await checkForecastReadiness();
      if (!readiness.ok) {
        notify.error("Couldn't forecast growth", { description: `${readiness.message} Nothing was saved.` });
        return;
      }

      if (readiness.data.old_log_crabs > 0) {
        setWarning(toOldLogsWarning(readiness.data));
        return;
      }
      await forecast(false);
    });

  const handleConfirm = (includeOldLogs: boolean) => {
    setWarning(null);
    startRun(() => forecast(includeOldLogs));
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-11 min-w-44 bg-card px-5"
        onClick={handleRun}
        disabled={isRunning || Boolean(disabledReasonId)}
        aria-busy={isRunning}
        aria-describedby={disabledReasonId}
      >
        <TrendingUp aria-hidden />
        {isRunning ? 'Forecasting…' : 'Forecast 7 days'}
      </Button>
      <CustomOldLogsForecastDialog
        warning={warning}
        onForecastAll={() => handleConfirm(true)}
        onForecastRecent={() => handleConfirm(false)}
        onCancel={() => setWarning(null)}
      />
    </>
  );
};

export default CustomRunPredictionButton;
