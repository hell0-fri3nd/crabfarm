import { toDayTimeLabel } from '@/lib/format';

import { ADMIN_ROLE } from '../types/users';

import type { ApiUser, FarmUser, Role } from '../types/users';

export const ROLE_LABELS = {
  DEVELOPER: 'Admin',
  USER: 'User',
  STAFF: 'Staff',
} as const satisfies Record<Role, string>;

// Mirrors ROLE_PERMISSIONS in api/app/core/security/permissions.py
export const ROLE_DESCRIPTIONS = {
  DEVELOPER: 'Everything, including adding, editing and resetting other admins.',
  USER: "Manages the team (add, edit, deactivate, reset non-admins) and views crabs, batches and live readings. Can't log crabs.",
  STAFF: "Logs crabs, creates batches, reads logs and watches live readings. Can't manage users.",
} as const satisfies Record<Role, string>;

export const toRoleArticle = (role: Role) => (role === ADMIN_ROLE ? 'an' : 'a');

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
