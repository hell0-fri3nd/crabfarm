'use server';

import type { ActionResult } from '@/types/api';

import { forecastsApi } from '../api/forecasts-api';
import { toForecastFailureMessage } from '../lib/forecast-errors';

import type { ForecastReadiness } from '../types/forecast';

export const checkForecastReadiness = async (): Promise<ActionResult<ForecastReadiness>> => {
  const result = await forecastsApi.readiness();
  if (!result.ok) return { ok: false, message: toForecastFailureMessage(result.status, result.message), errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
