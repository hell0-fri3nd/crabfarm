import CustomSeverityBadge from '@/components/custom/custom-severity-badge';

import type { SensorLog } from '../types/logs';

type CustomSensorStatusProps = {
  log: SensorLog;
};

const CustomSensorStatus = ({ log }: CustomSensorStatusProps) =>
  log.severity ? (
    <CustomSeverityBadge level={log.severity} />
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
      <span aria-hidden className="size-2 rounded-full bg-primary" />
      In range
    </span>
  );

export default CustomSensorStatus;
