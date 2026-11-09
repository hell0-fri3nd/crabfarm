import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toInitials } from '@/lib/format';

import type { FarmUser } from '../types/users';

type CustomUserIdentityProps = {
  user: FarmUser;
};

const CustomUserIdentity = ({ user }: CustomUserIdentityProps) => (
  <div className="flex min-w-0 items-center gap-3">
    <Avatar className="size-10">
      <AvatarFallback className="bg-primary/15 text-sm font-bold text-primary">{toInitials(user.name)}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold">
        {user.name}
        {user.is_self && <span className="font-normal text-muted-foreground"> (you)</span>}
      </p>
      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
    </div>
  </div>
);

export default CustomUserIdentity;
