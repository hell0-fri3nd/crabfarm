import { toFarmTime } from '@/lib/format';
import { WATER_SENSOR_DISPLAY } from '@/lib/water-sensors';
import { SENSOR_STATUS_LABELS } from '@/types/sensor';

import type { WaterAlert } from '@/stores/device-status-store';
import type { DeviceAlert } from '@/types/device';

const toSensor = (kind: DeviceAlert['sensor']) => WATER_SENSOR_DISPLAY.find((sensor) => sensor.kind === kind);

const toReading = ({ sensor, value }: DeviceAlert) => {
  const info = toSensor(sensor);
  const text = value.toFixed(info?.decimals ?? 2);
  return info?.unit ? `${text} ${info.unit}` : text;
};

export const toWaterAlertTitle = ({ sensor, status }: DeviceAlert) =>
  `${toSensor(sensor)?.label ?? sensor}: ${SENSOR_STATUS_LABELS[status].toLowerCase()}`;

export const toWaterAlertNotice = (alert: DeviceAlert) =>
  `Reading ${toReading(alert)}. Normal range is ${alert.normal_range}.`;

export const toWaterAlertDescription = (alert: WaterAlert) =>
  `Reached ${toReading(alert)} at ${toFarmTime(alert.since)}. Normal range is ${alert.normal_range}.`;

export const toSortedWaterAlerts = (alerts: WaterAlert[]) => {
  const order = WATER_SENSOR_DISPLAY.map(({ kind }) => kind);
  return alerts.toSorted(
    (left, right) =>
      Number(right.status === 'danger') - Number(left.status === 'danger') ||
      order.indexOf(left.sensor) - order.indexOf(right.sensor),
  );
};
