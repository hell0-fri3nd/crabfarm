import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { toFarmDayStart } from '@/lib/format';

import { logCountSchema, logSchema } from '../types/scan';

import type { CreateLogInput } from '../types/scan';

export const logsApi = {
  countToday: (now: Date) =>
    bff.get(`/logs?${new URLSearchParams({ from: toFarmDayStart(now), size: '1' })}`, logCountSchema),
  create: (input: CreateLogInput) => bff.post('/logs', { ...input, log_type: 'actual' }, logSchema),
};
