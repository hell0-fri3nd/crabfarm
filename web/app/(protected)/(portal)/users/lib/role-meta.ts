import type { Role } from '../types/users';

export const ROLE_LABELS = {
  admin: 'Admin',
  operator: 'Operator',
  viewer: 'Viewer',
} as const satisfies Record<Role, string>;

export const ROLE_DESCRIPTIONS = {
  admin: 'Everything, including users, roles and stopping the feeding system.',
  operator: 'Feed, edit schedules, print stickers, scan and log crabs.',
  viewer: "Dashboard, logs and the assistant. Can't change anything.",
} as const satisfies Record<Role, string>;

export const matchesSearch = ({ name, email }: { name: string; email: string }, query: string) => {
  const needle = query.trim().toLowerCase();
  return needle === '' || name.toLowerCase().includes(needle) || email.toLowerCase().includes(needle);
};
