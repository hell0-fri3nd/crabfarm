import type { Severity } from '@/types/severity';

import type { Forecast } from '../types/scan';

export type ForecastGap = {
  level: Severity;
  title: string;
  description: string;
};

const MEDIUM_GAP = 0.15;
const HIGH_GAP = 0.3;

const toPercent = (value: number) => `${Math.round(Math.abs(value) * 100)}%`;

export const checkAgainstForecast = (weightG: number, forecast: Forecast): ForecastGap | null => {
  const gap = (weightG - forecast.predicted_weight_g) / forecast.predicted_weight_g;
  if (Math.abs(gap) < MEDIUM_GAP) return null;

  const direction = gap < 0 ? 'under' : 'over';
  const level = Math.abs(gap) >= HIGH_GAP ? 'high' : 'medium';

  return {
    level,
    title: `${toPercent(gap)} ${direction} the forecast of ${forecast.predicted_weight_g} g`,
    description:
      direction === 'under'
        ? 'Check the scale is zeroed and the crab is fully on it, then weigh again. Save anyway if it really is this light.'
        : 'Check nothing else is on the scale, then weigh again. Save anyway if it really is this heavy.',
  };
};
