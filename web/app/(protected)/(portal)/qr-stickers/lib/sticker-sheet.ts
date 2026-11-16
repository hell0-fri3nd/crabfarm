import type { Batch, Crab, FileType, Paper, Sticker, StickerSize } from '../types/qr-stickers';

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
  png: 'One image per page at the paper’s real size (300 dpi), for a sticker printer or a print shop.',
} as const satisfies Record<FileType, string>;

export const SHEET_MARGIN_MM = 10;

// Level H survives ~30% damage, so the crab mark can cover the centre and the code still scans
export const QR_LEVEL = 'H';
const QR_LOGO_SHARE = 0.22;
const QR_LOGO_SRC = '/brand/crabfarm-mark.svg';

export const toQrLogo = (qrSize: number) => {
  const side = Math.round(qrSize * QR_LOGO_SHARE);
  return { src: QR_LOGO_SRC, width: side, height: side, excavate: true };
};

// Percent of the sticker's width, so the cut line and its dashes scale with the sticker size
export const CUT_LINE = { width: 0.6, radius: 6, dash: 4, gap: 3 } as const;
export const STICKER_GAP_MM = 4;

const fitCount = (lengthMm: number, sizeMm: number) =>
  Math.max(Math.floor((lengthMm - SHEET_MARGIN_MM * 2 + STICKER_GAP_MM) / (sizeMm + STICKER_GAP_MM)), 1);

const STICKER_SIZE_MM = { '30': 30, '40': 40, '50': 50 } as const satisfies Record<StickerSize, number>;

export const toSizeMm = (size: StickerSize) => STICKER_SIZE_MM[size];

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

export const compareNames = new Intl.Collator('en', { numeric: true }).compare;

export const toBatchLabel = (batch: Batch) => `Batch ${batch.id}`;

export const toCrabCode = (batch: Batch, crab: Crab) => `B${batch.id}-${crab.name}`;

export const getGroups = (crabs: Crab[]) => [...new Set(crabs.map(({ group_by }) => group_by))].sort(compareNames);

export const sortByName = (crabs: Crab[]) => [...crabs].sort((left, right) => compareNames(left.name, right.name));

export const getGroupCrabs = (crabs: Crab[], group: string) => sortByName(crabs.filter(({ group_by }) => group_by === group));

export const buildStickers = (batch: Batch, crabs: Crab[]): Sticker[] =>
  sortByName(crabs).map((crab) => ({ code: toCrabCode(batch, crab), batch_label: toBatchLabel(batch), group: crab.group_by }));

export const toPages = <T,>(items: T[], perPage: number) =>
  Array.from({ length: Math.ceil(items.length / perPage) }, (_, index) =>
    items.slice(index * perPage, index * perPage + perPage),
  );

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;
