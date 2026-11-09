'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { ROLE_LABELS } from '../lib/role-meta';
import { roleSchema } from '../types/users';

import type { FarmUser, Role } from '../types/users';

type CustomRoleSelectProps = {
  user: FarmUser;
  onChange: (role: Role) => void;
  className?: string;
};

const CustomRoleSelect = ({ user, onChange, className }: CustomRoleSelectProps) => {
  const isLocked = user.is_self || user.status === 'deactivated';

  const handleChange = (value: string) => {
    const parsed = roleSchema.safeParse(value);
    if (parsed.success && parsed.data !== user.role) onChange(parsed.data);
  };

  return (
    <Select value={user.role} onValueChange={handleChange} disabled={isLocked}>
      <SelectTrigger
        aria-label={`Role for ${user.name}`}
        title={user.is_self ? "You can't change your own role" : undefined}
        className={cn('data-[size=default]:h-11 w-full bg-card sm:w-36', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roleSchema.options.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CustomRoleSelect;
