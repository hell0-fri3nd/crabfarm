'use server';

import type { ActionResult } from '@/types/api';

import { usersApi } from '../api/users-api';
import { inviteUserSchema } from '../types/users';

import type { ApiUser, InviteUserInput } from '../types/users';

export const addUser = async (input: InviteUserInput): Promise<ActionResult<ApiUser>> => {
  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check the highlighted fields.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const result = await usersApi.create(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
