'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { notify } from '@/lib/notify';
import { isTrainingActive, modelStatusSchema } from '@/types/forecast-model';

import { useEventStream } from './use-event-stream';

import type { ModelStatus, ModelTraining } from '@/types/forecast-model';

const MODEL_STREAM_PATH = 'forecasts/stream';
const MODEL_EVENTS = ['forecast.model'] as const;
// Without a live stream (broker off), re-read the page while a training runs so it still ends on screen
const FALLBACK_REFRESH_MS = 10_000;

const announceFinished = ({ status, outcome, reason }: ModelTraining) => {
  const detail = reason ?? undefined;
  if (status === 'failed') return notify.error("Retraining didn't finish", { description: `${detail ?? 'The training stopped.'} The current model is still in use.` });
  if (status === 'insufficient_data') return notify.warning('Not enough logs to retrain yet', { description: detail });
  if (outcome === 'promoted') return notify.success('Growth model updated', { description: detail });
  return notify.info('Kept the current growth model', { description: detail });
};

// Starts from the server's read (null if it failed); the stream's first event is a fresh snapshot either way
export const useForecastModelStream = (initialStatus: ModelStatus | null, selfId: string) => {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [serverStatus, setServerStatus] = useState(initialStatus);
  const watchedTrainingRef = useRef<string | null>(null);

  if (initialStatus !== serverStatus) {
    setServerStatus(initialStatus);
    setStatus(initialStatus);
  }

  const { status: streamStatus } = useEventStream({
    path: MODEL_STREAM_PATH,
    events: MODEL_EVENTS,
    schema: modelStatusSchema,
    onEvent: (_, next) => setStatus(next),
  });

  const training = status?.training ?? null;
  const isTraining = status?.state === 'training';

  useEffect(() => {
    if (!training) return;
    if (isTrainingActive(training)) {
      if (training.started_by === selfId) watchedTrainingRef.current = training.training_id;
      return;
    }
    // Only the person who started the run hears how it ended; everyone else just sees the alert change
    if (watchedTrainingRef.current !== training.training_id) return;
    watchedTrainingRef.current = null;
    announceFinished(training);
    router.refresh();
  }, [training, selfId, router]);

  useEffect(() => {
    if (!isTraining || streamStatus === 'open') return;
    const timer = window.setInterval(() => router.refresh(), FALLBACK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [isTraining, streamStatus, router]);

  const markTrainingStarted = (started: ModelTraining) =>
    setStatus((current) => current && { ...current, state: 'training', training: started });

  return { status, markTrainingStarted };
};
