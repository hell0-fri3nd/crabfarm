import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';
import { currentUserSchema } from '@/types/session';

export const sessionApi = {
  me: () => bff.get('/auth/me', currentUserSchema),
  signOut: (refreshToken: string) => bff.post('/auth/sign-out', undefined, z.null(), { bearerToken: refreshToken }),
};
