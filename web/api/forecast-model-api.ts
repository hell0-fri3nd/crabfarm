import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { modelStatusSchema, modelTrainingSchema } from '@/types/forecast-model';

export const forecastModelApi = {
  get: () => bff.get('/forecasts/model', modelStatusSchema),
  retrain: () => bff.post('/forecasts/model-trainings', undefined, modelTrainingSchema),
};
