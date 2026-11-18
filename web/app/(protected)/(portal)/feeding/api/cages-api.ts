import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { cageSchema, cagesPageSchema } from '../types/feeding';

import type { CageActiveInput } from '../types/feeding';

export const cagesApi = {
  list: () => bff.get('/cages', cagesPageSchema),
  setActive: ({ id, is_active }: CageActiveInput) => bff.patch(`/cages/${id}`, { is_active }, cageSchema),
};
