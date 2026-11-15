'use server';

import { redirect } from 'next/navigation';

import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies, getRefreshToken } from '@/lib/session';

import { signOutApi } from '../api/sign-out-api';

// Cookies are cleared whatever FastAPI answers, so an outage can't keep someone signed in
export const signOut = async () => {
  const refreshToken = await getRefreshToken();
  if (refreshToken) await signOutApi.signOut(refreshToken);

  await clearSessionCookies();
  redirect(SIGN_IN_HREF);
};
