import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { teamPageSchema } from '@/types/team';

// The API caps a page at 100; a farm team fits in one. Only ADMIN and DEVELOPER may list users.
const teamQuery = new URLSearchParams({ size: '100', sort: 'name' });

export const teamApi = {
  list: () => bff.get(`/users?${teamQuery}`, teamPageSchema),
};
