import 'server-only';

import { cache } from 'react';

import { sessionApi } from '@/api/session-api';

export const getCurrentUser = cache(async () => {
  const result = await sessionApi.me();
  if (result.ok) return result.data;

  throw new Error(result.message);
});
