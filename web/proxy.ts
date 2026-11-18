import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { DASHBOARD_HREF } from '@/lib/navigation';
import { END_SESSION_HREF, PAGE_PATH_HEADER, PIN_HREF, SIGN_IN_HREF, toPinHref } from '@/lib/routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';

const ROUTER_CACHE_PARAM = '_rsc';

const redirectTo = (href: string, request: NextRequest) => NextResponse.redirect(new URL(href, request.url));

const toPagePath = ({ nextUrl: { pathname, searchParams } }: NextRequest) => {
  const params = new URLSearchParams(searchParams);
  params.delete(ROUTER_CACHE_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const continueWithPagePath = (request: NextRequest) => {
  const headers = new Headers(request.headers);
  headers.set(PAGE_PATH_HEADER, toPagePath(request));
  return NextResponse.next({ request: { headers } });
};

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
  if (hasAccessToken) return continueWithPagePath(request);
  return redirectTo(hasRefreshToken ? toPinHref(toPagePath(request)) : END_SESSION_HREF, request);
};

export const config = {
  // Every page except BFF Route Handlers, the detection WebSocket, Next.js internals and static files (anything with an extension)
  matcher: ['/((?!api/|ws/|_next/|.*\\..*).*)'],
};
