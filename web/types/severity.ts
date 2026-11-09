import { z } from 'zod';

export const severitySchema = z.enum(['high', 'medium', 'low']);

export type Severity = z.infer<typeof severitySchema>;
