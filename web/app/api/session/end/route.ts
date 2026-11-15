import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { SIGN_IN_HREF } from '@/lib/routes';
import { clearSessionCookies } from '@/lib/session';

export const GET = async (request: NextRequest) => {
  await clearSessionCookies();
  return NextResponse.redirect(new URL(SIGN_IN_HREF, request.url));
};
