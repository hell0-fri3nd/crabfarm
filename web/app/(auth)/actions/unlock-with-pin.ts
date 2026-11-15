'use server';

import { redirect } from 'next/navigation';

import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies, getRefreshToken, setAccessCookie } from '@/lib/session';
import type { ActionResult } from '@/types/api';

import { authApi } from '../api/auth-api';
import { pinSchema } from '../types/auth';

import type { PinInput, SignedInUser } from '../types/auth';

const UNAUTHORIZED = 401;

export const unlockWithPin = async (input: PinInput): Promise<ActionResult<SignedInUser>> => {
  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Enter your 4-digit PIN.',
      errors: parsed.error.issues.map(({ message, code }) => ({ field: 'pin', message, type: code })),
    };
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) redirect(SIGN_IN_HREF);

  const result = await authApi.unlockWithPin(parsed.data, refreshToken);
  if (!result.ok) {
    // A 401 without field errors means the refresh token itself was rejected, so the PIN can't help
    if (result.status === UNAUTHORIZED && result.errors.length === 0) {
      await clearSessionCookies();
      redirect(SIGN_IN_HREF);
    }
    return { ok: false, message: result.message, errors: result.errors };
  }

  const { access_token, ...user } = result.data;
  await setAccessCookie(access_token);

  return { ok: true, message: result.message, data: user };
};
