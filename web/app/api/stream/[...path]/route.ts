import type { NextRequest } from 'next/server';

import { proxyEventStream } from '@/lib/bff/stream-proxy';

export const GET = async (request: NextRequest, { params }: RouteContext<'/api/stream/[...path]'>) => {
  const { path } = await params;
  return proxyEventStream(request, path);
};
