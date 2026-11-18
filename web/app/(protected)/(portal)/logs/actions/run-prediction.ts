'use server';

import type { ActionResult } from '@/types/api';

import { forecastsApi } from '../api/forecasts-api';
import { toForecastFailureMessage } from '../lib/forecast-errors';
import { runPredictionSchema } from '../types/forecast';

import type { PredictionOutcome, RunPredictionInput } from '../types/forecast';

const NOT_ENOUGH_LOGS = 400;
const ALREADY_PREDICTED = 409;

export const runPrediction = async (input: RunPredictionInput): Promise<ActionResult<PredictionOutcome>> => {
  const parsed = runPredictionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: 'Choose which crabs to forecast.', errors: [] };

  const result = await forecastsApi.createForEveryCrab(parsed.data.includeOldLogs);

  if (result.ok) {
    const { forecasts, skipped_crab_ids, already_forecast_crab_ids, old_log_crab_ids } = result.data;
    return {
      ok: true,
      message: result.message,
      data: {
        kind: 'created',
        predicted: forecasts.length,
        skipped: skipped_crab_ids.length,
        alreadyPredicted: already_forecast_crab_ids.length,
        fromOldLogs: old_log_crab_ids.length,
      },
    };
  }

  // Both are expected farm states, not failures: the user just needs to know when a run will do something
  if (result.status === ALREADY_PREDICTED) return { ok: true, message: result.message, data: { kind: 'up-to-date' } };
  if (result.status === NOT_ENOUGH_LOGS) return { ok: true, message: result.message, data: { kind: 'not-enough-logs' } };

  return { ok: false, message: toForecastFailureMessage(result.status, result.message), errors: result.errors };
};
