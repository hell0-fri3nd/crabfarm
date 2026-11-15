import { z } from 'zod';

export const apiResponse = <T extends z.ZodType>(details: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    code: z.string().nullable(),
    details,
  });

export const fieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  type: z.string(),
});

export type FieldError = z.infer<typeof fieldErrorSchema>;

export const apiErrorSchema = z.object({
  detail: z.string(),
  errors: z.array(fieldErrorSchema).default([]),
});

export type ApiResult<T> =
  | { ok: true; status: number; message: string; data: T }
  | { ok: false; status: number; message: string; errors: FieldError[] };

export type ActionResult<T> =
  | { ok: true; message: string; data: T }
  | { ok: false; message: string; errors: FieldError[] };
