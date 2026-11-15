'use server';

import { redirect } from 'next/navigation';

import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies, getRefreshToken, setRotatedSessionCookies } from '@/lib/session';
import type { ActionResult } from '@/types/api';

import { authApi } from '../api/auth-api';
import { PIN_LOCKED_ERROR, pinSchema } from '../types/auth';

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
    const isLocked = result.errors.some(({ type }) => type === PIN_LOCKED_ERROR);
    // A 401 without field errors means the refresh session itself was rejected, so the PIN can't help
    const isSessionRejected = result.status === UNAUTHORIZED && result.errors.length === 0;

    if (isSessionRejected) {
      await clearSessionCookies();
      redirect(SIGN_IN_HREF);
    }
    if (isLocked) await clearSessionCookies();

    return { ok: false, message: result.message, errors: result.errors };
  }

  const { access_token, refresh_token, refresh_expires_at, ...user } = result.data;
  await setRotatedSessionCookies(
    { access_token, refresh_token },
    { name: user.name, refreshExpiresAt: refresh_expires_at },
  );

  return { ok: true, message: result.message, data: user };
};
