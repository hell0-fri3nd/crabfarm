import 'server-only';

import { cookies, headers as requestHeaders } from 'next/headers';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { z } from 'zod';

import { env } from '@/lib/env';
import { END_SESSION_HREF, PIN_HREF } from '@/lib/routes';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/lib/session';
import { apiErrorSchema, apiResponse } from '@/types/api';
import type { ApiResult } from '@/types/api';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  body?: unknown;
  isAuthenticated?: boolean;
  bearerToken?: string;
};

const REQUEST_TIMEOUT_MS = 10_000;
const UNAUTHORIZED = 401;

const UNREACHABLE_MESSAGE = "Couldn't reach the server. Check your connection and try again.";
const UNEXPECTED_MESSAGE = 'Something went wrong on our side. Try again in a moment.';

const failure = (status: number, message: string): ApiResult<never> => ({
  ok: false,
  status,
  message,
  errors: [],
});

const buildHeaders = async (hasBody: boolean, isAuthenticated: boolean, bearerToken?: string) => {
  // A FastAPI call is per request; Cache Components refuses crypto.randomUUID() in anything it could prerender
  await connection();
  const forwardedFor = (await requestHeaders()).get('x-forwarded-for');

  const headers = new Headers({ Accept: 'application/json', 'X-Correlation-ID': crypto.randomUUID() });
  if (hasBody) headers.set('Content-Type', 'application/json');

  // FastAPI rate-limits and audits by client IP; without this every user would share the BFF's address
  if (forwardedFor) headers.set('X-Forwarded-For', forwardedFor);

  if (!isAuthenticated) return headers;

  const token = bearerToken ?? (await cookies()).get(ACCESS_TOKEN_COOKIE)?.value;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
};

const leaveRejectedSession = async () => {
  const hasRefreshToken = (await cookies()).has(REFRESH_TOKEN_COOKIE);
  redirect(hasRefreshToken ? PIN_HREF : END_SESSION_HREF);
};

const readJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
};

const request = async <T extends z.ZodType>(
  method: Method,
  path: string,
  detailsSchema: T,
  { body, isAuthenticated = true, bearerToken }: RequestOptions = {},
): Promise<ApiResult<z.infer<T>>> => {
  const hasBody = body !== undefined;

  let response: Response;
  try {
    response = await fetch(`${env.API_URL}${env.API_PREFIX}${path}`, {
      method,
      headers: await buildHeaders(hasBody, isAuthenticated, bearerToken),
      body: hasBody ? JSON.stringify(body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[bff] ${method} ${path} failed to reach FastAPI`, error);
    return failure(0, UNREACHABLE_MESSAGE);
  }

  const json = await readJson(response);

  if (!response.ok) {
    const parsedError = apiErrorSchema.safeParse(json);
    if (!parsedError.success) return failure(response.status, UNEXPECTED_MESSAGE);

    const { detail, errors } = parsedError.data;
    // A token 401 (no field errors) on an access-token call means the session is gone; field 401s are wrong credentials
    const isRejectedSession = response.status === UNAUTHORIZED && errors.length === 0;
    if (isRejectedSession && isAuthenticated && !bearerToken) await leaveRejectedSession();

    return { ok: false, status: response.status, message: detail, errors };
  }

  const envelope = apiResponse(z.unknown()).safeParse(json);
  const details = detailsSchema.safeParse(envelope.data?.details);
  if (!envelope.success || !details.success) {
    console.error(`[bff] ${method} ${path} returned an unexpected body`, envelope.error ?? details.error);
    return failure(response.status, UNEXPECTED_MESSAGE);
  }

  return { ok: true, status: response.status, message: envelope.data.message, data: details.data };
};

export const bff = {
  get: <T extends z.ZodType>(path: string, schema: T, options?: Omit<RequestOptions, 'body'>) =>
    request('GET', path, schema, options),
  post: <T extends z.ZodType>(path: string, body: unknown, schema: T, options?: RequestOptions) =>
    request('POST', path, schema, { ...options, body }),
  put: <T extends z.ZodType>(path: string, body: unknown, schema: T, options?: RequestOptions) =>
    request('PUT', path, schema, { ...options, body }),
  patch: <T extends z.ZodType>(path: string, body: unknown, schema: T, options?: RequestOptions) =>
    request('PATCH', path, schema, { ...options, body }),
  delete: <T extends z.ZodType>(path: string, schema: T, options?: Omit<RequestOptions, 'body'>) =>
    request('DELETE', path, schema, options),
};
