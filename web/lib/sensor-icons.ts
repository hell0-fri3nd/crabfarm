import { Droplet, FlaskConical, GlassWater, Thermometer, Waves, Wind } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

import type { SensorKind } from '@/types/sensor';

export const SENSOR_ICONS = {
  temperature: Thermometer,
  ph: Droplet,
  salinity: Waves,
  ammonia: FlaskConical,
  turbidity: GlassWater,
  oxygen: Wind,
} as const satisfies Record<SensorKind, LucideIcon>;
