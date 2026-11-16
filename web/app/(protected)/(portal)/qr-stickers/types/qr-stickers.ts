import { z } from 'zod';

export const stickerSizeSchema = z.enum(['30', '40', '50']);
export type StickerSize = z.infer<typeof stickerSizeSchema>;

export const paperSchema = z.enum(['a4', 'short', 'long']);
export type Paper = z.infer<typeof paperSchema>;

export const fileTypeSchema = z.enum(['pdf', 'png']);
export type FileType = z.infer<typeof fileTypeSchema>;

export type { Batch, Crab } from '@/types/crab-management';

export const recordStickerDownloadSchema = z.object({
  batch_id: z.number().int().positive(),
  crab_ids: z.array(z.number().int().positive()).min(1, 'Pick at least one crab.').max(500),
  file_type: fileTypeSchema,
  sticker_size_mm: z.union([z.literal(30), z.literal(40), z.literal(50)]),
  paper: paperSchema,
});
export type RecordStickerDownloadInput = z.infer<typeof recordStickerDownloadSchema>;

export const stickerSchema = z.object({
  code: z.string(),
  batch_label: z.string(),
  group: z.string(),
});
export type Sticker = z.infer<typeof stickerSchema>;

export const downloadRecordSchema = z.object({
  id: z.string(),
  batch_label: z.string(),
  group: z.string(),
  crabs_label: z.string(),
  sheet_label: z.string(),
  file_type: fileTypeSchema,
  downloaded_at_label: z.string(),
  downloaded_by: z.string(),
});
export type DownloadRecord = z.infer<typeof downloadRecordSchema>;

export const stickerDownloadChangesSchema = z.object({
  batch_id: z.number().int().positive(),
  crab_names: z.array(z.string()),
  file_type: fileTypeSchema,
  sticker_size_mm: z.number(),
  paper: paperSchema,
});

export const stickerDownloadEventSchema = z.object({
  id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  actor_id: z.uuid().nullable(),
  actor_email: z.string().nullable(),
  changes: stickerDownloadChangesSchema,
});
export type StickerDownloadEvent = z.infer<typeof stickerDownloadEventSchema>;

export const stickerDownloadPageSchema = z.object({
  items: z.array(stickerDownloadEventSchema),
  total: z.number().int(),
  page: z.number().int(),
  size: z.number().int(),
});
