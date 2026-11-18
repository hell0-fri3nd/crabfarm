'use server';

import { forecastModelApi } from '@/api/forecast-model-api';

import type { ActionResult } from '@/types/api';
import type { ModelTraining } from '@/types/forecast-model';

export const retrainModel = async (): Promise<ActionResult<ModelTraining>> => {
  const result = await forecastModelApi.retrain();
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: result.data };
};
