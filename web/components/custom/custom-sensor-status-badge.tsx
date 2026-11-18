import CustomSeverityBadge from '@/components/custom/custom-severity-badge';
import { SENSOR_STATUS_LABELS } from '@/types/sensor';

import type { SensorStatus } from '@/types/sensor';

type CustomSensorStatusBadgeProps = {
  status: SensorStatus;
};

const CustomSensorStatusBadge = ({ status }: CustomSensorStatusBadgeProps) => {
  if (status === 'danger') return <CustomSeverityBadge level="high" label={SENSOR_STATUS_LABELS.danger} />;
  if (status === 'warning') return <CustomSeverityBadge level="medium" label={SENSOR_STATUS_LABELS.warning} />;

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
      <span aria-hidden className="size-2 rounded-full bg-primary" />
      {SENSOR_STATUS_LABELS.normal}
    </span>
  );
};

export default CustomSensorStatusBadge;
