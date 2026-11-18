'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { notify } from '@/lib/notify';

import { toInterruptionNotice } from '../lib/water-sensors';

import type { SensorConnection, SensorInterruption } from '../lib/water-sensors';

// The stream closes and reopens whenever the access token renews, which shouldn't raise an alarm
const OFFLINE_GRACE_MS = 10_000;

export const useSensorConnectionAlerts = (connection: SensorConnection, lastReadingAt: string | null) => {
  const [interruption, setInterruption] = useState<SensorInterruption | null>(null);

  const announce = useEffectEvent((next: Exclude<SensorConnection, 'checking'>) => {
    if (next === 'connected') {
      if (interruption) notify.success('Water sensors reconnected', { description: 'Live readings are back.' });
      setInterruption(null);
      return;
    }
    if (next === interruption) return;

    const { title, description } = toInterruptionNotice(next, lastReadingAt);
    notify.warning(title, { description });
    setInterruption(next);
  });

  useEffect(() => {
    if (connection === 'checking') return undefined;
    const timer = window.setTimeout(() => announce(connection), connection === 'offline' ? OFFLINE_GRACE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [connection]);

  return interruption;
};
