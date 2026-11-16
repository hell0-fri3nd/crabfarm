// Mirrors the API's role rules (docs/role-permissions.md) so pages can show what a role may do.
// Cosmetic only: FastAPI enforces every rule, so a stale entry here can never grant access.

export const PERMISSIONS = {
  'users.manage': ['DEVELOPER', 'ADMIN'],
  'users.manage_developers': ['DEVELOPER'],
  'batches.create': ['DEVELOPER', 'ADMIN'],
  'activity.view_everyone': ['DEVELOPER', 'ADMIN'],
} as const satisfies Record<string, readonly string[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: string | undefined, permission: Permission) =>
  role !== undefined && (PERMISSIONS[permission] as readonly string[]).includes(role);
