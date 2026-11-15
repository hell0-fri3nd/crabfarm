'use server';

import { z } from 'zod';

import type { ActionResult } from '@/types/api';

import { usersApi } from '../api/users-api';

import type { ApiUser } from '../types/users';

const userIdSchema = z.uuid();

const runFor = async (
  userId: string,
  call: (id: string) => ReturnType<typeof usersApi.deactivate>,
): Promise<ActionResult<ApiUser>> => {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) return { ok: false, message: "That user doesn't exist.", errors: [] };

  const result = await call(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};

export const deactivateUser = async (userId: string) => runFor(userId, usersApi.deactivate);

export const reactivateUser = async (userId: string) => runFor(userId, usersApi.reactivate);

export const resetUserCredentials = async (userId: string) => runFor(userId, usersApi.resetCredentials);
