import CustomSeverityBadge from '@/components/custom/custom-severity-badge';
import { cn } from '@/lib/utils';

import type { ContextReading } from '../types/assistant';

type CustomContextChipsProps = {
  readings: ContextReading[];
};

const CustomContextChips = ({ readings }: CustomContextChipsProps) => (
  <ul
    aria-label="Live readings the assistant can see"
    className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [mask-image:linear-gradient(to_right,black_85%,transparent)] sm:mx-0 sm:px-0"
  >
    {readings.map(({ id, label, value, severity }) => (
      <li
        key={id}
        className={cn(
          'flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm whitespace-nowrap',
          severity === 'high' && 'border-destructive/50',
        )}
      >
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value}</span>
        {severity && <CustomSeverityBadge level={severity} />}
      </li>
    ))}
  </ul>
);

export default CustomContextChips;
