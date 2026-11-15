'use server';

import { redirect } from 'next/navigation';

import { sessionApi } from '@/api/session-api';
import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies, getRefreshToken } from '@/lib/session';

export const signOut = async () => {
  const refreshToken = await getRefreshToken();
  // Revoking server-side is best effort: the cookies are cleared even if FastAPI is unreachable
  if (refreshToken) await sessionApi.signOut(refreshToken);

  await clearSessionCookies();
  redirect(SIGN_IN_HREF);
};
