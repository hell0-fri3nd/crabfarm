'use client';

import { useTransition } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';

import { retrainModel } from '@/actions/retrain-model';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toFarmShortDate, toFarmTime } from '@/lib/format';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

import type { ModelStatus, ModelTraining } from '@/types/forecast-model';

type CustomForecastModelAlertProps = {
  status: ModelStatus;
  canRetrain: boolean;
  onTrainingStarted: (training: ModelTraining) => void;
  id?: string;
  className?: string;
};

const ALREADY_RUNNING = 'A model training is already running';

const describeLastRun = ({ training }: ModelStatus) => {
  if (!training?.finished_at || training.outcome === 'promoted' || training.outcome === 'skipped') return '';
  return ` Last retrain on ${toFarmShortDate(training.finished_at)}: ${training.reason ?? "it didn't finish"}.`;
};

const crabDays = (count: number) => `${count} new crab-${count === 1 ? 'day' : 'days'}`;

const CustomForecastModelAlert = ({ status, canRetrain, onTrainingStarted, id, className }: CustomForecastModelAlertProps) => {
  const [isStarting, startRetrain] = useTransition();

  if (status.state === 'ready') return null;

  if (status.state === 'training') {
    const startedAt = status.training ? ` Started ${toFarmTime(status.training.started_at)}.` : '';
    const meanwhile = status.version
      ? 'Forecasts keep using the current model until it finishes.'
      : 'Forecast 7 days works once it finishes.';

    return (
      <Alert id={id} role="status" className={cn('rounded-xl border-info/40 bg-card px-4 py-4 sm:px-6 sm:py-5 [&>svg]:text-info', className)}>
        <LoaderCircle className="motion-safe:animate-spin" aria-hidden />
        <AlertTitle className="font-semibold">Retraining the growth model</AlertTitle>
        <AlertDescription className="text-muted-foreground">
          <p>{`${startedAt.trim()} ${meanwhile}`.trim()}</p>
        </AlertDescription>
      </Alert>
    );
  }

  const handleRetrain = () =>
    startRetrain(async () => {
      const result = await retrainModel();
      if (result.ok) {
        onTrainingStarted(result.data);
        return;
      }
      if (result.message.startsWith(ALREADY_RUNNING)) {
        notify.info('A retrain is already running', { description: 'This alert updates when it finishes.' });
        return;
      }
      notify.error("Couldn't start retraining", { description: `${result.message} The current model is still in use.` });
    });

  const isMissing = status.state === 'missing';
  const actionLabel = isMissing ? 'Train model' : 'Retrain model';
  const askAdmin = canRetrain ? '' : ' Ask an admin to train it.';
  const description = isMissing
    ? `No growth model is trained yet, so Forecast 7 days can't run.${describeLastRun(status)}${askAdmin}`
    : `${crabDays(status.new_logged_days ?? 0)} logged since it was trained${status.trained_at ? ` on ${toFarmShortDate(status.trained_at)}` : ''}. Retraining keeps forecasts close to how the crabs grow now.${describeLastRun(status)}`;

  return (
    <div id={id} className={className}>
      <CustomSeverityAlert
        level={isMissing ? 'medium' : 'low'}
        title={isMissing ? 'Growth forecasts are off' : 'Growth model is due for a retrain'}
        description={description}
        actions={
          canRetrain && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-w-36 bg-card/60 text-foreground"
              onClick={handleRetrain}
              disabled={isStarting}
              aria-busy={isStarting}
            >
              <RefreshCw aria-hidden />
              {isStarting ? 'Starting…' : actionLabel}
            </Button>
          )
        }
      />
    </div>
  );
};

export default CustomForecastModelAlert;
