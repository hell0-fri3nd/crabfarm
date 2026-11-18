'use client';

import CustomWaterNow from './custom-water-now';
import { useSensorConnectionAlerts } from './use-sensor-connection-alerts';
import { useWaterSensorStream } from '../events/use-water-sensor-stream';

import type { WaterSensorInfo } from '@/lib/water-sensors';

type CustomWaterMonitorProps = {
  sensors: WaterSensorInfo[];
};

const CustomWaterMonitor = ({ sensors }: CustomWaterMonitorProps) => {
  const { reading, connection } = useWaterSensorStream();
  const interruption = useSensorConnectionAlerts(connection, reading?.received_at ?? null);

  return <CustomWaterNow reading={reading} connection={connection} interruption={interruption} sensors={sensors} />;
};

export default CustomWaterMonitor;
