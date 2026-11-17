'use server';

import type { ActionResult } from '@/types/api';

import { detectionApi } from '../api/detection-api';

import type { DetectionTicket } from '../types/detection';

// The socket's only credential: a 30 s single-use ticket, so the browser never holds the access token
export const startDetection = async (): Promise<ActionResult<DetectionTicket>> => {
  const result = await detectionApi.createTicket();
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
