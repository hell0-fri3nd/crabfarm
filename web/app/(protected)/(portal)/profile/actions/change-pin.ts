'use server';

import type { ActionResult } from '@/types/api';

import { accountApi } from '../api/account-api';
import { pinFormSchema, toFieldErrors } from '../types/profile';

import type { PinFormInput } from '../types/profile';

export const changePin = async (input: PinFormInput): Promise<ActionResult<null>> => {
  const parsed = pinFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: 'Check the highlighted fields.', errors: toFieldErrors(parsed.error.issues) };
  }

  const { current_pin, new_pin } = parsed.data;
  const result = await accountApi.changePin({ current_pin, new_pin });
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: null };
};
