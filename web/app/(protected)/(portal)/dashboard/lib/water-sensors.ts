import { toDayTimeLabel, toFarmTime } from '@/lib/format';

import type { StreamStatus } from '@/events/use-event-stream';
import type { WaterSensorInfo } from '@/lib/water-sensors';
import type { SensorKind, SensorStatus } from '@/types/sensor';
import type { ApiSensorLog } from '@/types/water-sensor-log';

import type { SensorReading } from '../types/dashboard';
import type { WaterSensorReading } from '../types/water-sensor';

export type SensorConnection = 'checking' | 'connected' | 'disconnected' | 'offline';

export type SensorInterruption = Extract<SensorConnection, 'disconnected' | 'offline'>;

export const toInterruptionNotice = (interruption: SensorInterruption, lastReadingAt: string | null) => {
  if (interruption === 'offline') {
    return {
      title: 'Live water feed interrupted',
      description: "Can't reach the server, so readings may be out of date. Retrying on its own.",
    };
  }

  const checkTheBoard = "Check the sensor board's power and Wi-Fi.";

  return lastReadingAt
    ? {
        title: 'Water sensors disconnected',
        description: `No reading since ${toFarmTime(lastReadingAt)}. ${checkTheBoard}`,
      }
    : {
        title: 'Water sensors not connected',
        description: `No reading since this page opened. ${checkTheBoard}`,
      };
};

export const toSensorConnection = (status: StreamStatus, hasReading: boolean, isStale: boolean): SensorConnection => {
  if (status === 'connecting') return 'checking';
  if (status !== 'open') return 'offline';
  if (isStale) return 'disconnected';
  return hasReading ? 'connected' : 'checking';
};

const READING_FIELDS = {
  temperature: 'temperature_c',
  ph: 'ph',
  salinity: 'salinity_ppt',
  ammonia: 'ammonia_mg_l',
  turbidity: 'turbidity_ntu',
  oxygen: 'do_mg_l',
} as const satisfies Record<SensorKind, keyof WaterSensorReading>;

export const toSensorReadings = (
  latest: WaterSensorReading | null,
  isLive: boolean,
  sensors: WaterSensorInfo[],
): SensorReading[] =>
  sensors.map(({ normal_range, ...sensor }) => {
    const current = isLive ? latest : null;

    return {
      ...sensor,
      value: current ? current[READING_FIELDS[sensor.kind]] : null,
      safe_label: `Normal ${normal_range}`,
      change_label: 'now',
      last_seen_label: latest ? toFarmTime(latest.received_at) : null,
      status: current ? current.statuses[sensor.kind] : null,
    };
  });

export const toWorstStatus = (readings: SensorReading[]): SensorStatus => {
  if (readings.some(({ status }) => status === 'danger')) return 'danger';
  return readings.some(({ status }) => status === 'warning') ? 'warning' : 'normal';
};

const toLoggedReadings = (logs: ApiSensorLog[], sensors: WaterSensorInfo[]): SensorReading[] =>
  sensors.map(({ normal_range, ...sensor }) => {
    const log = logs.find(({ sensor: kind }) => kind === sensor.kind);

    return {
      ...sensor,
      value: log?.value ?? null,
      safe_label: `Normal ${normal_range}`,
      change_label: '',
      last_seen_label: null,
      status: log?.status ?? null,
    };
  });

// The API returns one row per sensor; the card shows one row per 30-minute log
export const toLoggedUpdates = (logs: ApiSensorLog[], now: Date, sensors: WaterSensorInfo[]) =>
  Object.entries(Object.groupBy(logs, ({ slot_at }) => slot_at)).map(([slotAt, slotLogs = []]) => {
    const readings = toLoggedReadings(slotLogs, sensors);
    return {
      key: slotAt,
      time: toDayTimeLabel(slotLogs[0]?.measured_at ?? slotAt, now),
      readings,
      status: toWorstStatus(readings),
    };
  });
