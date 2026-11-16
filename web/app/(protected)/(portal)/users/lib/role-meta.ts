import { toDayTimeLabel } from '@/lib/format';

import type { ApiUser, FarmUser, Role } from '../types/users';

export const ROLE_LABELS = {
  DEVELOPER: 'Developer',
  ADMIN: 'Admin',
  STAFF: 'Staff',
} as const satisfies Record<Role, string>;

// Mirrors the role table in api/context/02-api-design.md §11
export const ROLE_DESCRIPTIONS = {
  DEVELOPER: 'Everything, including adding, editing and resetting other developers.',
  ADMIN: 'Manages the team (add, edit, deactivate, reset non-developers), creates batches, logs crabs and watches live readings.',
  STAFF: "Logs crabs, views batches and logs, and watches live readings. Can't create batches or manage users.",
} as const satisfies Record<Role, string>;

export const toRoleArticle = (role: Role) => (role === 'ADMIN' ? 'an' : 'a');

export const toStatus = ({ is_active, needs_onboarding }: ApiUser): FarmUser['status'] =>
  !is_active ? 'deactivated' : needs_onboarding ? 'invited' : 'active';

export const toFarmUser = (user: ApiUser, selfId: string, now = new Date()): FarmUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  status: toStatus(user),
  last_active_label: user.last_active_at ? toDayTimeLabel(user.last_active_at, now) : 'Never signed in',
  is_self: user.id === selfId,
});

export const matchesSearch = ({ name, email }: { name: string; email: string }, query: string) => {
  const needle = query.trim().toLowerCase();
  return needle === '' || name.toLowerCase().includes(needle) || email.toLowerCase().includes(needle);
};
