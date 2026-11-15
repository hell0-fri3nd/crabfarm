import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { pinResultSchema, signInResultSchema } from '../types/auth';

import type { PinInput, SignInInput } from '../types/auth';

export const authApi = {
  signIn: (input: SignInInput) => bff.post('/auth/sign-in', input, signInResultSchema, { isAuthenticated: false }),
  unlockWithPin: (input: PinInput, refreshToken: string) =>
    bff.post('/auth/sign-in/pin', input, pinResultSchema, { bearerToken: refreshToken }),
};
