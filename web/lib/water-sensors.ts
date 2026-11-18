import type { SensorKind } from '@/types/sensor';
import type { WaterSensorThreshold } from '@/types/water-sensor-threshold';

type WaterSensorDisplay = {
  kind: SensorKind;
  label: string;
  unit: string;
  decimals: number;
};

export type WaterSensorInfo = WaterSensorDisplay & {
  safe_min: number | null;
  safe_max: number | null;
  scale_min: number;
  scale_max: number;
  normal_range: string;
};

export const WATER_SENSOR_DISPLAY: WaterSensorDisplay[] = [
  { kind: 'temperature', label: 'Temperature', unit: '°C', decimals: 1 },
  { kind: 'ph', label: 'pH', unit: '', decimals: 1 },
  { kind: 'salinity', label: 'Salinity', unit: 'ppt', decimals: 1 },
  { kind: 'ammonia', label: 'Ammonia', unit: 'mg/L', decimals: 2 },
  { kind: 'turbidity', label: 'Turbidity', unit: 'NTU', decimals: 1 },
  { kind: 'oxygen', label: 'Oxygen', unit: 'mg/L', decimals: 1 },
];

const SCALE_MARGIN = 0.25;

const toScale = ({ warning, danger, normal_min, normal_max }: WaterSensorThreshold) => {
  const limits = [...warning, ...danger].flat().concat(normal_min, normal_max);
  const finiteLimits = limits.filter((limit) => limit !== null);
  // With no lower limit (ammonia), the normal band runs down from zero
  const low = normal_min === null ? Math.min(0, ...finiteLimits) : Math.min(...finiteLimits);
  const high = Math.max(...finiteLimits, low + 1);
  const margin = (high - low) * SCALE_MARGIN;
  return { scale_min: low >= 0 ? Math.max(low - margin, 0) : low - margin, scale_max: high + margin };
};

export const toWaterSensorInfos = (thresholds: WaterSensorThreshold[]): WaterSensorInfo[] =>
  WATER_SENSOR_DISPLAY.flatMap((display) => {
    const threshold = thresholds.find(({ sensor }) => sensor === display.kind);
    if (!threshold) return [];

    return {
      ...display,
      ...toScale(threshold),
      safe_min: threshold.normal_min,
      safe_max: threshold.normal_max,
      normal_range: threshold.normal_range,
    };
  });
