import { FARM_TIME_ZONE, toFarmDayKey } from '@/lib/format';

import type { ChartPoint, CrabLog, LogType } from '../types/logs';

type Measure = 'weight_g' | 'width_mm';

const dayLabel = new Intl.DateTimeFormat('en-US', { timeZone: FARM_TIME_ZONE, month: 'short', day: 'numeric' });
const dayLabelWithYear = new Intl.DateTimeFormat('en-US', {
  timeZone: FARM_TIME_ZONE,
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const toOneDecimal = (value: number) => Math.round(value * 10) / 10;

// The growth model reads a crab's latest log of each day as that day's measurement, so the chart does too
const latestValue = (dayLogs: CrabLog[], type: LogType, measure: Measure) => {
  const value = dayLogs
    .filter((log) => log.log_type === type && log[measure] !== null)
    .toSorted((left, right) => right.logged_at.localeCompare(left.logged_at))[0]?.[measure];
  return value === undefined || value === null ? null : toOneDecimal(value);
};

export const toChartPoints = (logs: CrabLog[]): ChartPoint[] => {
  const days = Object.entries(Object.groupBy(logs, ({ logged_at }) => toFarmDayKey(logged_at))).toSorted(
    ([left], [right]) => left.localeCompare(right),
  );
  const spansYears = new Set(days.map(([day]) => day.slice(0, 4))).size > 1;
  const labelFormat = spansYears ? dayLabelWithYear : dayLabel;

  return days.map(([day, dayLogs = []]) => ({
    day,
    label: labelFormat.format(new Date(`${day}T12:00:00+08:00`)),
    actual_weight_g: latestValue(dayLogs, 'actual', 'weight_g'),
    forecast_weight_g: latestValue(dayLogs, 'prediction', 'weight_g'),
    actual_width_mm: latestValue(dayLogs, 'actual', 'width_mm'),
    forecast_width_mm: latestValue(dayLogs, 'prediction', 'width_mm'),
  }));
};
