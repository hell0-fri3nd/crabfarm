import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { apiUserSchema, usersPageSchema } from '../types/users';

import type { InviteUserInput, Role } from '../types/users';

// The API caps a page at 100; a farm team fits in one
const PAGE_SIZE = 100;

const userPath = (userId: string) => `/users/${encodeURIComponent(userId)}`;

export const usersApi = {
  list: () => bff.get(`/users?${new URLSearchParams({ size: String(PAGE_SIZE), sort: 'name' })}`, usersPageSchema),
  create: (input: InviteUserInput) => bff.post('/users', input, apiUserSchema),
  updateRole: (userId: string, role: Role) => bff.patch(userPath(userId), { role }, apiUserSchema),
  deactivate: (userId: string) => bff.delete(userPath(userId), apiUserSchema),
  reactivate: (userId: string) => bff.post(`${userPath(userId)}/reactivate`, undefined, apiUserSchema),
  resetCredentials: (userId: string) => bff.post(`${userPath(userId)}/reset-credentials`, undefined, apiUserSchema),
};
