import type { Batch, FileType, Paper, Sticker, StickerSize } from '../types/qr-stickers';

export const PAPER = {
  a4: { label: 'A4', widthMm: 210, heightMm: 297 },
  short: { label: 'Short', widthMm: 216, heightMm: 279 },
  long: { label: 'Long', widthMm: 216, heightMm: 330 },
} as const satisfies Record<Paper, { label: string; widthMm: number; heightMm: number }>;

export const STICKER_SIZE_HINTS = {
  '30': '30 mm fits small crabs. Keep it out of standing water.',
  '40': '40 mm survives a wet shell best. Print on waterproof vinyl.',
  '50': '50 mm reads from further away. Uses more vinyl.',
} as const satisfies Record<StickerSize, string>;

export const FILE_TYPE_HINTS = {
  pdf: 'Opens the print dialog. Choose “Save as PDF” and set scale to 100%.',
  png: 'One image of the whole sheet, for a sticker printer or a print shop.',
} as const satisfies Record<FileType, string>;

export const SHEET_MARGIN_MM = 10;
export const STICKER_GAP_MM = 4;

const fitCount = (lengthMm: number, sizeMm: number) =>
  Math.max(Math.floor((lengthMm - SHEET_MARGIN_MM * 2 + STICKER_GAP_MM) / (sizeMm + STICKER_GAP_MM)), 1);

export const toSizeMm = (size: StickerSize) => Number(size);

export const getSheetLayout = (size: StickerSize, paper: Paper) => {
  const sizeMm = toSizeMm(size);
  const { widthMm, heightMm } = PAPER[paper];
  const columns = fitCount(widthMm, sizeMm);
  const rows = fitCount(heightMm, sizeMm);
  return { columns, rows, perPage: columns * rows };
};

export const toPaperDescription = (paper: Paper) => {
  const { label, widthMm, heightMm } = PAPER[paper];
  return `${label}, ${widthMm} × ${heightMm} mm`;
};

export const toCrabCode = (batchNumber: number, group: string, crabNumber: number) =>
  `B${batchNumber}-${group}-${String(crabNumber).padStart(2, '0')}`;

export const getCrabNumbers = (batch: Batch) => Array.from({ length: batch.crabs_per_group }, (_, index) => index + 1);

export const buildStickers = (batch: Batch, group: string, crabNumbers: number[]): Sticker[] =>
  [...crabNumbers]
    .sort((left, right) => left - right)
    .map((crabNumber) => ({
      code: toCrabCode(batch.number, group, crabNumber),
      batch_code: batch.code,
      group,
    }));

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;
