import 'server-only';

import { bff } from '@/lib/bff/api-client';

import { RECENT_DOWNLOADS } from '../lib/download-history';
import { stickerDownloadPageSchema } from '../types/qr-stickers';

// The API scopes rows by role: ADMIN and DEVELOPER get everyone's downloads, STAFF only their own
const recentDownloadsQuery = new URLSearchParams({
  action: 'crab.sticker_download',
  outcome: 'SUCCESS',
  size: String(RECENT_DOWNLOADS),
  sort: '-occurred_at',
});

export const auditEventsApi = {
  listStickerDownloads: () => bff.get(`/audit-events?${recentDownloadsQuery}`, stickerDownloadPageSchema),
};
