'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useEventStream } from '@/events/use-event-stream';
import { notify } from '@/lib/notify';
import { toWaterAlertNotice, toWaterAlertTitle } from '@/lib/water-alerts';
import { useDeviceStatusStore } from '@/stores/device-status-store';
import { deviceNameSchema, deviceStatusEventSchema } from '@/types/device';

import type { DeviceAlert, DeviceName } from '@/types/device';
import type { SensorKind, SensorStatus } from '@/types/sensor';

const DEVICE_STATUS_STREAM_PATH = 'devices/stream';
const DEVICE_STATUS_EVENTS = ['device.status'] as const;
// Devices have no presence signal of their own, so this long without a message counts as disconnected
const STALE_AFTER_MS = 10_000;
// Readings can flip between levels, so an alert outlives its last sighting instead of flickering
const ALERT_HOLD_MS = 30_000;
const ALERT_PRUNE_EVERY_MS = 5_000;
const NOTIFY_AGAIN_AFTER_MS = 5 * 60 * 1000;

type NotifiedAlert = {
  status: SensorStatus;
  at_ms: number;
};

export const useDeviceStatusStream = () => {
  const staleTimersRef = useRef<Partial<Record<DeviceName, number>>>({});
  const notifiedRef = useRef<Partial<Record<SensorKind, NotifiedAlert>>>({});

  const startStaleTimer = useCallback((device: DeviceName) => {
    window.clearTimeout(staleTimersRef.current[device]);
    staleTimersRef.current[device] = window.setTimeout(
      () => useDeviceStatusStore.getState().setConnection(device, 'disconnected'),
      STALE_AFTER_MS,
    );
  }, []);

  const notifyAlerts = (alerts: DeviceAlert[], nowMs: number) => {
    alerts.forEach((alert) => {
      const previous = notifiedRef.current[alert.sensor];
      const isEscalation = previous?.status === 'warning' && alert.status === 'danger';
      if (previous && !isEscalation && nowMs - previous.at_ms < NOTIFY_AGAIN_AFTER_MS) return;

      notifiedRef.current[alert.sensor] = { status: alert.status, at_ms: nowMs };
      const send = alert.status === 'danger' ? notify.error : notify.warning;
      send(toWaterAlertTitle(alert), { description: toWaterAlertNotice(alert) });
    });
  };

  const { status } = useEventStream({
    path: DEVICE_STATUS_STREAM_PATH,
    events: DEVICE_STATUS_EVENTS,
    schema: deviceStatusEventSchema,
    onEvent: (_, { device, seen_at, alerts }) => {
      const store = useDeviceStatusStore.getState();
      store.setConnection(device, 'connected');
      startStaleTimer(device);
      if (device !== 'water_sensors') return;

      const nowMs = Date.now();
      store.applyWaterAlerts(alerts, seen_at, nowMs);
      notifyAlerts(alerts, nowMs);
    },
  });

  useEffect(() => useDeviceStatusStore.getState().setStatus(status), [status]);

  useEffect(() => {
    if (status !== 'open') return undefined;
    const timers = staleTimersRef.current;
    deviceNameSchema.options.forEach(startStaleTimer);
    return () => deviceNameSchema.options.forEach((device) => window.clearTimeout(timers[device]));
  }, [status, startStaleTimer]);

  useEffect(() => {
    const timer = window.setInterval(
      () => useDeviceStatusStore.getState().pruneWaterAlerts(Date.now() - ALERT_HOLD_MS),
      ALERT_PRUNE_EVERY_MS,
    );
    return () => window.clearInterval(timer);
  }, []);
};
