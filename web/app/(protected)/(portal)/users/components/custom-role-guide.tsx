import { Card } from '@/components/ui/card';

import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/role-meta';
import { roleSchema } from '../types/users';

const CustomRoleGuide = () => (
  <section aria-labelledby="role-guide-title" className="flex flex-col gap-4">
    <h2 id="role-guide-title" className="text-lg font-semibold">
      What each role can do
    </h2>
    <ul className="grid gap-5 md:grid-cols-3">
      {roleSchema.options.map((role) => (
        <li key={role}>
          <Card className="h-full gap-2 rounded-xl p-4 shadow-none sm:p-5">
            <h3 className="text-sm font-semibold">{ROLE_LABELS[role]}</h3>
            <p className="text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </Card>
        </li>
      ))}
    </ul>
  </section>
);

export default CustomRoleGuide;
