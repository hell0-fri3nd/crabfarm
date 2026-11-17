import { z } from 'zod';

export const stickerSizeSchema = z.enum(['30', '40', '50']);
export type StickerSize = z.infer<typeof stickerSizeSchema>;
