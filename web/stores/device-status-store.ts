import { create } from 'zustand';

import type { StreamStatus } from '@/events/use-event-stream';
import type { DeviceAlert, DeviceConnection, DeviceName } from '@/types/device';

export type WaterAlert = DeviceAlert & {
  since: string;
  last_seen_ms: number;
};

const WATER_ALERT_ID_PREFIX = 'water-';

// Includes when it began, so acknowledging covers this episode and a new or worse one shows again
export const toWaterAlertId = ({ sensor, since }: Pick<WaterAlert, 'sensor' | 'since'>) =>
  `${WATER_ALERT_ID_PREFIX}${sensor}-${since}`;

type DeviceStatusState = {
  status: StreamStatus;
  connections: Record<DeviceName, DeviceConnection>;
  waterAlerts: WaterAlert[];
  acknowledgedAlertIds: string[];
  setStatus: (status: StreamStatus) => void;
  setConnection: (device: DeviceName, connection: DeviceConnection) => void;
  applyWaterAlerts: (alerts: DeviceAlert[], seenAt: string, nowMs: number) => void;
  pruneWaterAlerts: (oldestAllowedMs: number) => void;
  acknowledgeAlert: (id: string) => void;
  restoreAlert: (id: string) => void;
};

export const useDeviceStatusStore = create<DeviceStatusState>((set) => ({
  status: 'connecting',
  connections: { scale: 'checking', water_sensors: 'checking' },
  waterAlerts: [],
  acknowledgedAlertIds: [],
  setStatus: (status) => set({ status }),
  setConnection: (device, connection) =>
    set((state) => ({ connections: { ...state.connections, [device]: connection } })),
  applyWaterAlerts: (alerts, seenAt, nowMs) =>
    set((state) => {
      const updated = alerts.map((alert): WaterAlert => {
        const current = state.waterAlerts.find(({ sensor }) => sensor === alert.sensor);
        // The first value of an episode stays, so a card doesn't change text every two seconds
        return current?.status === alert.status
          ? { ...current, last_seen_ms: nowMs }
          : { ...alert, since: seenAt, last_seen_ms: nowMs };
      });
      const untouched = state.waterAlerts.filter(({ sensor }) => !alerts.some((alert) => alert.sensor === sensor));
      return { waterAlerts: [...updated, ...untouched] };
    }),
  pruneWaterAlerts: (oldestAllowedMs) =>
    set((state) => {
      if (!state.waterAlerts.some(({ last_seen_ms }) => last_seen_ms < oldestAllowedMs)) return state;

      const waterAlerts = state.waterAlerts.filter(({ last_seen_ms }) => last_seen_ms >= oldestAllowedMs);
      const openIds = waterAlerts.map(toWaterAlertId);
      return {
        waterAlerts,
        acknowledgedAlertIds: state.acknowledgedAlertIds.filter(
          (id) => !id.startsWith(WATER_ALERT_ID_PREFIX) || openIds.includes(id),
        ),
      };
    }),
  acknowledgeAlert: (id) => set((state) => ({ acknowledgedAlertIds: [...state.acknowledgedAlertIds, id] })),
  restoreAlert: (id) =>
    set((state) => ({ acknowledgedAlertIds: state.acknowledgedAlertIds.filter((alertId) => alertId !== id) })),
}));

export const useDashboardAlertCount = (otherAlertCount: number) =>
  useDeviceStatusStore(({ acknowledgedAlertIds, waterAlerts }) => {
    const otherAcknowledged = acknowledgedAlertIds.filter((id) => !id.startsWith(WATER_ALERT_ID_PREFIX)).length;
    const openWaterAlerts = waterAlerts.filter((alert) => !acknowledgedAlertIds.includes(toWaterAlertId(alert))).length;
    return Math.max(otherAlertCount - otherAcknowledged, 0) + openWaterAlerts;
  });
