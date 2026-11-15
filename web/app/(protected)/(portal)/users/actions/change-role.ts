'use server';

import type { ActionResult } from '@/types/api';

import { usersApi } from '../api/users-api';
import { changeRoleSchema } from '../types/users';

import type { ChangeRoleInput, Role } from '../types/users';

export const changeRole = async (input: ChangeRoleInput): Promise<ActionResult<{ role: Role }>> => {
  const parsed = changeRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Pick a valid role.', errors: [] };

  const result = await usersApi.updateRole(parsed.data.user_id, parsed.data.role);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: { role: result.data.role } };
};
