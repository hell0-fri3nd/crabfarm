'use server';

import { setSessionCookies } from '@/lib/session';
import type { ActionResult } from '@/types/api';

import { authApi } from '../api/auth-api';
import { signInSchema } from '../types/auth';

import type { SignedInUser, SignInInput } from '../types/auth';

export const signIn = async (input: SignInInput): Promise<ActionResult<SignedInUser>> => {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Check the highlighted fields.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({
        field: path.join('.'),
        message,
        type: code,
      })),
    };
  }

  const result = await authApi.signIn(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  const { access_token, refresh_token, ...user } = result.data;
  await setSessionCookies(
    { access_token, refresh_token },
    { name: user.name, isRemembered: parsed.data.remember_me },
  );

  return { ok: true, message: result.message, data: user };
};
