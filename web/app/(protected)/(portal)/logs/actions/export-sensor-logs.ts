'use server';

import type { ActionResult } from '@/types/api';

import { loadAllSensorLogs } from '../lib/load-sensor-logs';
import { logsSearchParamsSchema } from '../types/logs';

import type { SensorLog } from '../types/logs';

export const exportSensorLogs = async (
  filters: Record<string, string>,
): Promise<ActionResult<{ rows: SensorLog[]; total: number }>> => {
  const result = await loadAllSensorLogs(logsSearchParamsSchema.parse(filters), new Date());
  if (!result.ok) return { ok: false, message: result.message, errors: [] };

  return { ok: true, message: 'Sensor logs exported', data: { rows: result.rows, total: result.total } };
};
