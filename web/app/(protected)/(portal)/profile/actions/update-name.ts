'use server';

import type { ActionResult } from '@/types/api';

import { accountApi } from '../api/account-api';
import { nameFormSchema, toFieldErrors } from '../types/profile';

import type { NameFormInput } from '../types/profile';

export const updateName = async (input: NameFormInput): Promise<ActionResult<NameFormInput>> => {
  const parsed = nameFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Check the highlighted fields.', errors: toFieldErrors(parsed.error.issues) };
  }

  const result = await accountApi.updateName(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: { name: result.data.name } };
};
