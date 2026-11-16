import 'server-only';

import { withEmptyList } from '@/lib/api-result';
import { bff } from '@/lib/bff/api-client';
import { batchSchema } from '@/types/crab-management';

export const batchesApi = {
  list: async () => withEmptyList(await bff.get('/batches', batchSchema.array())),
  create: () => bff.post('/batches', undefined, batchSchema),
};
