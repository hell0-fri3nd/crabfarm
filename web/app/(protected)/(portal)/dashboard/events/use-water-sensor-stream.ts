'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useEventStream } from '@/events/use-event-stream';

import { toSensorConnection } from '../lib/water-sensors';
import { waterSensorReadingSchema } from '../types/water-sensor';

import type { WaterSensorReading } from '../types/water-sensor';

const WATER_SENSOR_STREAM_PATH = 'water-sensors/stream';
const READING_EVENTS = ['water_sensor.reading'] as const;
// The sensors have no presence signal of their own, so this long without a reading counts as disconnected
const STALE_AFTER_MS = 10_000;

// Live water readings (ESP32 → MQTT crab/sensor → API → SSE)
export const useWaterSensorStream = () => {
  const [reading, setReading] = useState<WaterSensorReading | null>(null);
  const [isStale, setIsStale] = useState(false);
  const staleTimerRef = useRef<number | undefined>(undefined);

  const startStaleTimer = useCallback(() => {
    window.clearTimeout(staleTimerRef.current);
    staleTimerRef.current = window.setTimeout(() => setIsStale(true), STALE_AFTER_MS);
  }, []);

  const { status } = useEventStream({
    path: WATER_SENSOR_STREAM_PATH,
    events: READING_EVENTS,
    schema: waterSensorReadingSchema,
    onEvent: (_, next) => {
      setReading(next);
      setIsStale(false);
      startStaleTimer();
    },
  });

  useEffect(() => {
    if (status !== 'open') return undefined;
    startStaleTimer();
    return () => window.clearTimeout(staleTimerRef.current);
  }, [status, startStaleTimer]);

  return { reading, connection: toSensorConnection(status, reading !== null, isStale) };
};
