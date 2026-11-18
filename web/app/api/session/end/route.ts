import { redirect } from 'next/navigation';

import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies } from '@/lib/session';

export const GET = async () => {
  await clearSessionCookies();
  redirect(SIGN_IN_HREF);
};
