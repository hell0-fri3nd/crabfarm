import type { ApiResult } from '@/types/api';

const NOT_FOUND = 404;

// The API answers an empty batch or crab list with 404, which here just means "none yet"
export const withEmptyList = <T,>(result: ApiResult<T[]>): ApiResult<T[]> =>
  !result.ok && result.status === NOT_FOUND ? { ok: true, status: NOT_FOUND, message: result.message, data: [] } : result;

export const firstFailure = (...results: ApiResult<unknown>[]) =>
  results.flatMap((result) => (result.ok ? [] : [result.message]))[0];
