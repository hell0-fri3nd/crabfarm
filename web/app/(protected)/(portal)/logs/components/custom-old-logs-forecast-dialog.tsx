'use client';

import { TriangleAlert } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import type { ForecastReadiness } from '../types/forecast';

export type OldLogsWarning = {
  readiness: ForecastReadiness;
  newestAgeDays: number;
};

type CustomOldLogsForecastDialogProps = {
  warning: OldLogsWarning | null;
  onForecastAll: () => void;
  onForecastRecent: () => void;
  onCancel: () => void;
};

const FORECAST_DAYS = 7;
const HISTORY_DAYS = 14;

const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });

const toDateLabel = (day: string | null) => (day ? dateFormat.format(new Date(`${day}T00:00:00Z`)) : '');

const toCrabCount = (count: number) => `${count} ${count === 1 ? 'crab' : 'crabs'}`;

const toDayCount = (count: number) => `${count} ${count === 1 ? 'day' : 'days'}`;

const toAgeSentence = ({ readiness: { old_log_crabs, oldest_last_log, newest_last_log }, newestAgeDays }: OldLogsWarning) => {
  const age = toDayCount(newestAgeDays);
  if (oldest_last_log === newest_last_log) {
    return `${old_log_crabs === 1 ? 'Its last log is' : 'Their last logs are'} from ${toDateLabel(newest_last_log)}, ${age} ago.`;
  }
  return `Their last logs are from ${toDateLabel(oldest_last_log)} to ${toDateLabel(newest_last_log)}. The newest is ${age} old.`;
};

const CustomOldLogsForecastDialog = ({ warning, onForecastAll, onForecastRecent, onCancel }: CustomOldLogsForecastDialogProps) => {
  const oldCrabs = warning?.readiness.old_log_crabs ?? 0;
  const recentCrabs = warning?.readiness.recent_crabs ?? 0;

  return (
    <AlertDialog open={warning !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
            Forecast {toCrabCount(oldCrabs)} from old logs?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-3">
              {warning && <p>{toAgeSentence(warning)}</p>}
              <ul className="flex list-disc flex-col gap-1 pl-5">
                <li>Each forecast covers the next {FORECAST_DAYS} days, starting today.</li>
                <li>
                  It reads each crab&apos;s latest {HISTORY_DAYS} logged days. Growth since those logs isn&apos;t counted, so treat
                  the numbers as rough.
                </li>
                <li>Forecasts stay saved in the logs and can&apos;t be removed here.</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          {recentCrabs > 0 && (
            <AlertDialogCancel className="h-11" onClick={onForecastRecent}>
              Forecast {recentCrabs} recent only
            </AlertDialogCancel>
          )}
          <AlertDialogAction className="h-11" onClick={onForecastAll}>
            {recentCrabs > 0 ? `Forecast all ${oldCrabs + recentCrabs} crabs` : `Forecast ${toCrabCount(oldCrabs)}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CustomOldLogsForecastDialog;
