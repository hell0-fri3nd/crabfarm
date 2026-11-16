import { PAPER, compareNames, pluralize } from './sticker-sheet';

import type { DownloadRecord, StickerDownloadEvent } from '../types/qr-stickers';

export const RECENT_DOWNLOADS = 5;

export const ACTIVITY_DOWNLOADS_HREF = `/activity?${new URLSearchParams({ q: 'sticker' })}`;

const DOWNLOADED_AT_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export const toDownloadedAtLabel = (date: Date) => DOWNLOADED_AT_FORMAT.format(date);

export const toCrabsLabel = (names: string[]) => {
  const sorted = [...names].sort(compareNames);
  return sorted.length > 2 ? `${pluralize(sorted.length, 'crab')}, ${sorted[0]}–${sorted.at(-1)}` : sorted.join(', ');
};

export const toGroupsLabel = (names: string[]) =>
  [...new Set(names.map((name) => name.replace(/\d+$/, '')))].sort(compareNames).join(', ');

export const toDownloadRecord = (event: StickerDownloadEvent, selfId: string): DownloadRecord => {
  const { batch_id, crab_names, file_type, sticker_size_mm, paper } = event.changes;
  return {
    id: event.id,
    batch_label: `Batch ${batch_id}`,
    group: toGroupsLabel(crab_names),
    crabs_label: toCrabsLabel(crab_names),
    sheet_label: `${sticker_size_mm} mm, ${PAPER[paper].label}`,
    file_type,
    downloaded_at_label: toDownloadedAtLabel(new Date(event.occurred_at)),
    downloaded_by: event.actor_id === selfId ? 'You' : (event.actor_email ?? 'Someone'),
  };
};
