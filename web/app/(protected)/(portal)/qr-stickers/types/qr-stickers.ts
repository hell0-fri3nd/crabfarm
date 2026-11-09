import { z } from 'zod';

export const stickerSizeSchema = z.enum(['30', '40', '50']);
export type StickerSize = z.infer<typeof stickerSizeSchema>;

export const paperSchema = z.enum(['a4', 'short', 'long']);
export type Paper = z.infer<typeof paperSchema>;

export const fileTypeSchema = z.enum(['pdf', 'png']);
export type FileType = z.infer<typeof fileTypeSchema>;

export const batchSchema = z.object({
  code: z.string(),
  number: z.number().int().positive(),
  tagged_count: z.number().int().min(0),
  groups: z.array(z.string().regex(/^[A-Z]$/)).min(1),
  crabs_per_group: z.number().int().positive(),
});
export type Batch = z.infer<typeof batchSchema>;

export const stickerSchema = z.object({
  code: z.string(),
  batch_code: z.string(),
  group: z.string(),
});
export type Sticker = z.infer<typeof stickerSchema>;

export const downloadRecordSchema = z.object({
  id: z.string(),
  batch_code: z.string(),
  group: z.string(),
  crabs_label: z.string(),
  sheet_label: z.string(),
  file_type: fileTypeSchema,
  downloaded_at_label: z.string(),
  downloaded_by: z.string(),
});
export type DownloadRecord = z.infer<typeof downloadRecordSchema>;
