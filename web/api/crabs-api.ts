import 'server-only';

import { withEmptyList } from '@/lib/api-result';
import { bff } from '@/lib/bff/api-client';
import { crabSchema } from '@/types/crab-management';

export const crabsApi = {
  list: async () => withEmptyList(await bff.get('/crabs', crabSchema.array())),
};
