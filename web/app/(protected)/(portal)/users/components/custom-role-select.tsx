'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { ROLE_LABELS } from '../lib/role-meta';
import { ADMIN_ROLE, roleSchema } from '../types/users';

import type { FarmUser, Role } from '../types/users';

type CustomRoleSelectProps = {
  user: FarmUser;
  canManageAdmins: boolean;
  onChange: (role: Role) => void;
  className?: string;
};

const toLockReason = (user: FarmUser, canManageAdmins: boolean) => {
  if (user.is_self) return "You can't change your own role";
  if (user.status === 'deactivated') return 'Reactivate them first';
  if (user.role === ADMIN_ROLE && !canManageAdmins) return 'Only an admin can change an admin';
  return undefined;
};

const CustomRoleSelect = ({ user, canManageAdmins, onChange, className }: CustomRoleSelectProps) => {
  const lockReason = toLockReason(user, canManageAdmins);
  const options = roleSchema.options.filter((role) => canManageAdmins || role !== ADMIN_ROLE || role === user.role);

  const handleChange = (value: string) => {
    const parsed = roleSchema.safeParse(value);
    if (parsed.success && parsed.data !== user.role) onChange(parsed.data);
  };

  return (
    <Select value={user.role} onValueChange={handleChange} disabled={lockReason !== undefined}>
      <SelectTrigger
        aria-label={`Role for ${user.name}`}
        title={lockReason}
        className={cn('data-[size=default]:h-11 w-full bg-card sm:w-36', className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CustomRoleSelect;
