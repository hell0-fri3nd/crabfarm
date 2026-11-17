import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { detectionTicketSchema } from '../types/detection';

export const detectionApi = {
  createTicket: () => bff.post('/detections/tickets', {}, detectionTicketSchema),
};
