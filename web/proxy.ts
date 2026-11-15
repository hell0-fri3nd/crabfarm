import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { DASHBOARD_HREF } from '@/lib/navigation';
import { END_SESSION_HREF, PIN_HREF, SIGN_IN_HREF } from '@/lib/routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

const redirectTo = (href: string, request: NextRequest) => NextResponse.redirect(new URL(href, request.url));

// Optimistic only: checks that the cookies exist. Layouts verify the session against FastAPI.
export const proxy = (request: NextRequest) => {
  const hasAccessToken = request.cookies.has(ACCESS_TOKEN_COOKIE);
  const hasRefreshToken = request.cookies.has(REFRESH_TOKEN_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname === SIGN_IN_HREF) {
    if (hasAccessToken) return redirectTo(DASHBOARD_HREF, request);
    return hasRefreshToken ? redirectTo(PIN_HREF, request) : NextResponse.next();
  }
  // Never send /pin to the portal on an access cookie alone: a rejected one would loop /dashboard ↔ /pin
  if (pathname === PIN_HREF) return hasRefreshToken ? NextResponse.next() : redirectTo(END_SESSION_HREF, request);

  // Every other page is protected, so new (portal) routes need no registration here
  if (hasAccessToken) return NextResponse.next();
  return redirectTo(hasRefreshToken ? PIN_HREF : END_SESSION_HREF, request);
};

export const config = {
  // Every page except BFF Route Handlers, Next.js internals and static files (anything with an extension)
  matcher: ['/((?!api/|_next/|.*\\..*).*)'],
};
