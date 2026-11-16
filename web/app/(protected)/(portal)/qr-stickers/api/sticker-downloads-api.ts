import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';

import type { RecordStickerDownloadInput } from '../types/qr-stickers';

export const stickerDownloadsApi = {
  record: (input: RecordStickerDownloadInput) => bff.post('/crabs/sticker-downloads', input, z.null()),
};
