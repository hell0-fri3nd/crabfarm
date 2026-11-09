import CustomSeverityBadge from '@/components/custom/custom-severity-badge';
import { Card } from '@/components/ui/card';

import type { ContextReading } from '../types/assistant';

type CustomAssistantContextProps = {
  readings: ContextReading[];
};

const CustomAssistantContext = ({ readings }: CustomAssistantContextProps) => (
  <aside aria-labelledby="assistant-sees" className="hidden min-h-0 lg:block">
    <Card className="max-h-full gap-4 overflow-y-auto rounded-2xl p-6 [scrollbar-width:thin]">
      <h2 id="assistant-sees" className="text-base font-semibold tracking-tight">
        What it can see
      </h2>
      <dl className="divide-y divide-border">
        {readings.map(({ id, label, value, severity }) => (
          <div key={id} className="flex min-h-10 items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="flex min-w-0 items-center gap-2 text-sm font-medium">
              {label}
              {severity && <CustomSeverityBadge level={severity} />}
            </dt>
            <dd className="shrink-0 text-sm font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  </aside>
);

export default CustomAssistantContext;
