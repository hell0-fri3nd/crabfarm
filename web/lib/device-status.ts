import { deviceNameSchema } from '@/types/device';

import type { StreamStatus } from '@/events/use-event-stream';
import type { DeviceConnection, DeviceName } from '@/types/device';

export type DeviceSummaryTone = 'muted' | 'connected' | 'warning' | 'danger';

type DeviceSummary = {
  label: string;
  tone: DeviceSummaryTone;
};

const DEVICE_LABELS = {
  scale: 'Scale',
  water_sensors: 'Water sensors',
} as const satisfies Record<DeviceName, string>;

const CHECKING: DeviceSummary = { label: 'Checking devices…', tone: 'muted' };

export const toDeviceSummary = (status: StreamStatus, connections: Record<DeviceName, DeviceConnection>): DeviceSummary => {
  if (status === 'connecting') return CHECKING;
  if (status === 'reconnecting') return { label: 'Reconnecting…', tone: 'warning' };
  if (status === 'closed') return { label: 'Live feed offline', tone: 'danger' };

  const devices = deviceNameSchema.options;
  const missing = devices.filter((device) => connections[device] === 'disconnected');
  const [onlyMissing] = missing;

  if (missing.length === devices.length) return { label: 'No devices connected', tone: 'danger' };
  if (missing.length > 1) return { label: `${missing.length} devices not connected`, tone: 'warning' };
  if (onlyMissing) return { label: `${DEVICE_LABELS[onlyMissing]} not connected`, tone: 'warning' };
  if (devices.some((device) => connections[device] === 'checking')) return CHECKING;
  return { label: 'All devices connected', tone: 'connected' };
};
