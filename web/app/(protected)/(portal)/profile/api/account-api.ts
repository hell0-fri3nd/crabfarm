import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';
import { currentUserSchema } from '@/types/session';

import { activityEventSchema } from '../types/profile';

import type { ChangePasswordInput, ChangePinInput, NameFormInput } from '../types/profile';

export const accountApi = {
  activity: (limit: number) =>
    bff.get(`/auth/me/activity?${new URLSearchParams({ limit: String(limit) })}`, z.array(activityEventSchema)),
  updateName: (input: NameFormInput) => bff.patch('/auth/me', input, currentUserSchema),
  changePassword: (input: ChangePasswordInput) => bff.patch('/auth/change-password', input, z.null()),
  changePin: (input: ChangePinInput) => bff.patch('/auth/change-pin', input, z.null()),
};
