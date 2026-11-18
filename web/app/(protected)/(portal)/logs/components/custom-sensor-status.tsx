import CustomSensorStatusBadge from '@/components/custom/custom-sensor-status-badge';

import type { SensorLog } from '../types/logs';

type CustomSensorStatusProps = {
  log: SensorLog;
};

const CustomSensorStatus = ({ log }: CustomSensorStatusProps) => <CustomSensorStatusBadge status={log.status} />;

export default CustomSensorStatus;
