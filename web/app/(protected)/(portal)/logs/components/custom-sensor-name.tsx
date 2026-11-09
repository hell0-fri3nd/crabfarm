import { SENSOR_ICONS } from '@/lib/sensor-icons';

import type { SensorLog } from '../types/logs';

type CustomSensorNameProps = {
  log: SensorLog;
};

const CustomSensorName = ({ log }: CustomSensorNameProps) => {
  const Icon = SENSOR_ICONS[log.sensor];
  return (
    <span className="inline-flex items-center gap-2 font-semibold">
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      {log.sensor_label}
    </span>
  );
};

export default CustomSensorName;
