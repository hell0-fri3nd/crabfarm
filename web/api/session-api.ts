import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { currentUserSchema } from '@/types/session';

export const sessionApi = {
  me: () => bff.get('/auth/me', currentUserSchema),
};
