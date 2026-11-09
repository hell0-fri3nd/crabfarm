import { forecastSchema } from '../types/scan';

// Preview data shaped like the API until Scan reads /qr/scan, the scale and the forecasts

export const PREVIEW_LOGGED_TODAY = 14;

export const PREVIEW_TEST_CODES = ['B3-B-02', 'B3-B-04', 'B3-A-01'] as const;

const PREVIEW_FORECASTS = forecastSchema.array().parse([
  { code: 'B3-B-02', predicted_weight_g: 176, predicted_width_cm: 8.5 },
  { code: 'B3-B-04', predicted_weight_g: 180, predicted_width_cm: 8.6 },
  { code: 'B3-A-01', predicted_weight_g: 182, predicted_width_cm: 8.7 },
]);

const PREVIEW_SCALE_READINGS: Record<string, number> = {
  'B3-B-02': 182.4,
  'B3-B-04': 121.6,
  'B3-A-01': 179.0,
};

const PREVIEW_CAMERA_WIDTHS: Record<string, number> = {
  'B3-B-02': 8.7,
  'B3-B-04': 7.1,
  'B3-A-01': 8.6,
};

const DEFAULT_FORECAST = { predicted_weight_g: 178, predicted_width_cm: 8.6 };

export const getPreviewForecast = (code: string) =>
  PREVIEW_FORECASTS.find((forecast) => forecast.code === code) ?? { code, ...DEFAULT_FORECAST };

export const getPreviewScaleReading = (code: string) => PREVIEW_SCALE_READINGS[code] ?? 178.2;

export const getPreviewCameraWidth = (code: string) => PREVIEW_CAMERA_WIDTHS[code] ?? 8.6;
