'use client';

import { useEffect, useRef, useState } from 'react';

import { useEventStream } from '@/events/use-event-stream';

import { scaleReadingSchema } from '../types/scale';

const WEIGHT_STREAM_PATH = 'scales/stream';
const READING_EVENTS = ['scale.reading'] as const;
// The scale publishes every 2 s, so three missed readings mean it's off or out of Wi-Fi
const STALE_AFTER_MS = 6000;

// Live weight from the crab scale (ESP32 → MQTT crab/weight → API → SSE), in grams
export const useWeightStream = () => {
  const [weightG, setWeightG] = useState<number | null>(null);
  const [isFresh, setIsFresh] = useState(false);
  const staleTimerRef = useRef<number | undefined>(undefined);

  const { status } = useEventStream({
    path: WEIGHT_STREAM_PATH,
    events: READING_EVENTS,
    schema: scaleReadingSchema,
    onEvent: (_, reading) => {
      setWeightG(reading.weight_g);
      setIsFresh(true);
      window.clearTimeout(staleTimerRef.current);
      staleTimerRef.current = window.setTimeout(() => setIsFresh(false), STALE_AFTER_MS);
    },
  });

  useEffect(() => () => window.clearTimeout(staleTimerRef.current), []);

  return { weightG, isConnected: status === 'open' && isFresh };
};
