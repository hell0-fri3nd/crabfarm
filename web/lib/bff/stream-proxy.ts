import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { env } from '@/lib/env';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session';
import { apiErrorSchema } from '@/types/api';

const STREAM_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*\/stream$/;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
} as const;

const errorResponse = (status: number, detail: string) => NextResponse.json({ detail, errors: [] }, { status });

// EventSource can't follow redirects or read status codes, so failures are plain JSON errors and the hook reports them
export const proxyEventStream = async (request: NextRequest, segments: string[]) => {
  const path = segments.join('/');
  if (!STREAM_PATH.test(path)) return errorResponse(404, 'Not a stream');

  const accessToken = (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return errorResponse(401, 'Not authenticated');

  const headers = new Headers({
    Accept: 'text/event-stream',
    Authorization: `Bearer ${accessToken}`,
    'X-Correlation-ID': crypto.randomUUID(),
  });
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('X-Forwarded-For', forwardedFor);

  let upstream: Response;
  try {
    upstream = await fetch(`${env.API_URL}${env.API_PREFIX}/${path}${request.nextUrl.search}`, {
      headers,
      cache: 'no-store',
      signal: request.signal,
    });
  } catch (error) {
    console.error(`[bff] stream ${path} failed to reach FastAPI`, error);
    return errorResponse(502, "Couldn't reach the server");
  }

  if (!upstream.ok || !upstream.body) {
    const parsed = apiErrorSchema.safeParse(await upstream.json().catch(() => undefined));
    return errorResponse(upstream.status, parsed.success ? parsed.data.detail : 'Stream unavailable');
  }

  return new Response(upstream.body, { status: 200, headers: SSE_HEADERS });
};
