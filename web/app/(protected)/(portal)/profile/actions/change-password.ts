'use server';

import { getCurrentUser } from '@/lib/auth';
import type { ActionResult } from '@/types/api';

import { accountApi } from '../api/account-api';
import { createPasswordFormSchema, toFieldErrors } from '../types/profile';

import type { PasswordFormInput } from '../types/profile';

export const changePassword = async (input: PasswordFormInput): Promise<ActionResult<null>> => {
  const { name } = await getCurrentUser();
  const parsed = createPasswordFormSchema(name).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Check the highlighted fields.', errors: toFieldErrors(parsed.error.issues) };
  }

  const { current_password, new_password } = parsed.data;
  const result = await accountApi.changePassword({ current_password, new_password });
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: null };
};
