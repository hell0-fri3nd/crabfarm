import { z } from 'zod';

export const PIN_LENGTH = 4;

export const pinCodeSchema = z
  .string()
  .regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `Enter all ${PIN_LENGTH} digits.`);
