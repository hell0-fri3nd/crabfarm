export const formatReading = (value: number, decimals: number) => value.toFixed(decimals);

export const toMeterPercent = (value: number, min: number, max: number) =>
  Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
