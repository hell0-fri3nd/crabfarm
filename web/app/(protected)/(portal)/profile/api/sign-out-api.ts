import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';

export const signOutApi = {
  // No body: the refresh token is the session being ended, and sending it ourselves skips the client's 401 → /pin redirect
  signOut: (refreshToken: string) => bff.post('/auth/sign-out', undefined, z.null(), { bearerToken: refreshToken }),
};
