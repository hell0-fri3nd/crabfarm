import CustomSeverityBadge from '@/components/custom/custom-severity-badge';

import { formatSignedPercent } from '../lib/log-filters';

import type { CrabLog } from '../types/logs';

type CustomVsPredictedProps = {
  log: CrabLog;
};

const CustomVsPredicted = ({ log }: CustomVsPredictedProps) => (
  <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
    {log.flag && <CustomSeverityBadge level={log.flag} />}
    <span className="font-semibold">{formatSignedPercent(log.vs_predicted_pct)}</span>
  </span>
);

export default CustomVsPredicted;
