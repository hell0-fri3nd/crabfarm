import type { StickerSize } from '@/types/sticker';

export const STICKER_SIZE_MM = { '30': 30, '40': 40, '50': 50 } as const satisfies Record<StickerSize, number>;

// The QR is printed at this share of the sticker's width with no quiet zone
export const QR_SHARE = 0.62;

export const toSizeMm = (size: StickerSize) => STICKER_SIZE_MM[size];
