import { z } from 'zod';

export const sensorKindSchema = z.enum(['temperature', 'ph', 'salinity', 'ammonia', 'oxygen']);

export type SensorKind = z.infer<typeof sensorKindSchema>;
