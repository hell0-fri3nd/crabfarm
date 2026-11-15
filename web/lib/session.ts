import 'server-only';

import { cookies } from 'next/headers';

import { env } from '@/lib/env';

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_DAY = 86_400;

const cookiePrefix = (() => {
  if (!env.COOKIE_SECURE) return '';
  return env.COOKIE_PATH === '/' ? '__Host-' : '__Secure-';
})();

export const ACCESS_TOKEN_COOKIE = `${cookiePrefix}access_token`;
export const REFRESH_TOKEN_COOKIE = `${cookiePrefix}refresh_token`;
export const USER_NAME_COOKIE = `${cookiePrefix}user_name`;

export const SESSION_MAX_AGE = {
  access: env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * SECONDS_PER_MINUTE,
  refresh: env.JWT_REFRESH_TOKEN_EXPIRE_DAYS * SECONDS_PER_DAY,
  rememberedRefresh: env.JWT_REFRESH_TOKEN_REMEMBER_ME_DAYS * SECONDS_PER_DAY,
} as const;

const BASE_COOKIE_OPTIONS = { httpOnly: true, secure: env.COOKIE_SECURE, path: env.COOKIE_PATH } as const;

type SessionTokens = {
  access_token: string;
  refresh_token: string;
};

type SessionOptions = {
  name: string;
  isRemembered: boolean;
};

export const setAccessCookie = async (accessToken: string) => {
  const cookieStore = await cookies();
  cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
    ...BASE_COOKIE_OPTIONS,
    sameSite: env.ACCESS_COOKIE_SAMESITE,
    maxAge: SESSION_MAX_AGE.access,
  });
};

const setRefreshCookies = async (refreshToken: string, name: string, maxAge: number) => {
  const cookieStore = await cookies();
  const refreshOptions = { ...BASE_COOKIE_OPTIONS, sameSite: env.REFRESH_COOKIE_SAMESITE, maxAge };

  cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshOptions);
  // Lets /pin greet the user by name while the access token is expired; it lives as long as the refresh token
  cookieStore.set(USER_NAME_COOKIE, name, refreshOptions);
};

export const setSessionCookies = async (
  { access_token, refresh_token }: SessionTokens,
  { name, isRemembered }: SessionOptions,
) => {
  await setAccessCookie(access_token);
  await setRefreshCookies(
    refresh_token,
    name,
    isRemembered ? SESSION_MAX_AGE.rememberedRefresh : SESSION_MAX_AGE.refresh,
  );
};

// A PIN unlock rotates the refresh token but keeps its original expiry, so the cookie follows that date
export const setRotatedSessionCookies = async (
  { access_token, refresh_token }: SessionTokens,
  { name, refreshExpiresAt }: { name: string; refreshExpiresAt: string },
) => {
  const secondsLeft = Math.max(Math.floor((Date.parse(refreshExpiresAt) - Date.now()) / 1000), 0);
  await setAccessCookie(access_token);
  await setRefreshCookies(refresh_token, name, secondsLeft);
};

export const getRefreshToken = async () => (await cookies()).get(REFRESH_TOKEN_COOKIE)?.value;

export const getSignedInName = async () => (await cookies()).get(USER_NAME_COOKIE)?.value;

export const clearSessionCookies = async () => {
  const cookieStore = await cookies();
  [ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, USER_NAME_COOKIE].forEach((name) =>
    cookieStore.delete({ name, path: env.COOKIE_PATH }),
  );
};
