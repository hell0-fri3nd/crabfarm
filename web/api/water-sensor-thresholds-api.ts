import 'server-only';

import { bff } from '@/lib/bff/api-client';
import { waterSensorThresholdSchema } from '@/types/water-sensor-threshold';

export const waterSensorThresholdsApi = {
  list: () => bff.get('/water-sensors/thresholds', waterSensorThresholdSchema.array()),
};
