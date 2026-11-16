'use server';

import type { ActionResult } from '@/types/api';

import { stickerDownloadsApi } from '../api/sticker-downloads-api';
import { recordStickerDownloadSchema } from '../types/qr-stickers';

import type { RecordStickerDownloadInput } from '../types/qr-stickers';

export const recordStickerDownload = async (input: RecordStickerDownloadInput): Promise<ActionResult<null>> => {
  const parsed = recordStickerDownloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? 'Check the sticker options.',
      errors: parsed.error.issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const result = await stickerDownloadsApi.record(parsed.data);
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: null };
};
