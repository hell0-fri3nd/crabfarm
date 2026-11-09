import { Check, Dot } from 'lucide-react';

import { cn } from '@/lib/utils';
import { createPasswordRules, isRuleMet } from '@/types/password-rules';

type CustomPasswordRulesProps = {
  id?: string;
  password: string;
  name: string;
};

const CustomPasswordRules = ({ id, password, name }: CustomPasswordRulesProps) => (
  <ul id={id} className="flex flex-col gap-1.5 text-sm">
    {createPasswordRules(name).map((rule) => {
      const isMet = isRuleMet(rule, password);

      return (
        <li key={rule.id} className={cn('flex items-center gap-2', isMet ? 'text-foreground' : 'text-muted-foreground')}>
          {isMet ? <Check className="size-4 text-primary" aria-hidden /> : <Dot className="size-4" aria-hidden />}
          {rule.label}
          <span className="sr-only">{isMet ? ' — met' : ' — not met yet'}</span>
        </li>
      );
    })}
  </ul>
);

export default CustomPasswordRules;
