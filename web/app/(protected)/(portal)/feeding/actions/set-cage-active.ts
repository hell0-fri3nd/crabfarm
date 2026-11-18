'use server';

import type { ActionResult } from '@/types/api';

import { cagesApi } from '../api/cages-api';
import { cageActiveSchema } from '../types/feeding';

import type { Cage, CageActiveInput } from '../types/feeding';

export const setCageActive = async (input: CageActiveInput): Promise<ActionResult<Cage>> => {
  const parsed = cageActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "That cage isn't valid.", errors: [] };

  const result = await cagesApi.setActive(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
