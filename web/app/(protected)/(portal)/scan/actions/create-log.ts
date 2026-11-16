'use server';

import type { ActionResult } from '@/types/api';

import { logsApi } from '../api/logs-api';
import { createLogSchema } from '../types/scan';

import type { CreateLogInput, Log } from '../types/scan';

export const createLog = async (input: CreateLogInput): Promise<ActionResult<Log>> => {
  const parsed = createLogSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Check the weight and width.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const result = await logsApi.create(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
