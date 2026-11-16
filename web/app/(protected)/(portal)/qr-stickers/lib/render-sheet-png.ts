import { CUT_LINE, PAPER, SHEET_MARGIN_MM, STICKER_GAP_MM, getSheetLayout, toPages, toSizeMm } from './sticker-sheet';

import type { Paper, Sticker, StickerSize } from '../types/qr-stickers';

type RenderSheetOptions = {
  stickers: Sticker[];
  qrCanvases: Map<string, HTMLCanvasElement>;
  size: StickerSize;
  paper: Paper;
  onProgress: (done: number, total: number) => void;
  signal: AbortSignal;
};

// ~300 dpi; printed stickers are the one place raw colours and sizes are allowed (03 §7)
const PX_PER_MM = 12;
const INK = '#0a1f15';
const MUTED_INK = '#3d5a4a';
const CUT_INK = '#d4d4d4';

const PNG_SIGNATURE_BYTES = 8;
const IHDR_CHUNK_BYTES = 25;

const CRC_TABLE = Array.from({ length: 256 }, (_, index) =>
  Array.from({ length: 8 }).reduce<number>((crc) => (crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1), index),
);

const crc32 = (bytes: Uint8Array) =>
  (bytes.reduce((crc, byte) => (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

// Canvas PNGs carry no resolution, so viewers assume 72–96 dpi; a pHYs chunk makes "print at 100%" true size
const withPrintResolution = async (blob: Blob) => {
  const pixelsPerMetre = PX_PER_MM * 1000;
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  chunk[16] = 1;
  view.setUint32(17, crc32(chunk.subarray(4, 17)));

  const png = new Uint8Array(await blob.arrayBuffer());
  const headerEnd = PNG_SIGNATURE_BYTES + IHDR_CHUNK_BYTES;
  return new Blob([png.subarray(0, headerEnd), chunk, png.subarray(headerEnd)], { type: 'image/png' });
};

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const getMonoFamily = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';

const drawSticker = (
  context: CanvasRenderingContext2D,
  sticker: Sticker,
  qrCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  side: number,
  monoFamily: string,
) => {
  context.save();
  const unit = side / 100;
  const inset = (CUT_LINE.width * unit) / 2;
  context.strokeStyle = CUT_INK;
  context.lineWidth = CUT_LINE.width * unit;
  context.setLineDash([CUT_LINE.dash * unit, CUT_LINE.gap * unit]);
  context.beginPath();
  context.roundRect(x + inset, y + inset, side - inset * 2, side - inset * 2, CUT_LINE.radius * unit);
  context.stroke();
  context.restore();

  const qrSide = side * 0.62;
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, x + (side - qrSide) / 2, y + side * 0.08, qrSide, qrSide);

  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const centerX = x + side / 2;

  context.fillStyle = INK;
  context.font = `700 ${side * 0.11}px ${monoFamily}`;
  context.fillText(sticker.code, centerX, y + side * 0.83);

  context.fillStyle = MUTED_INK;
  context.font = `500 ${side * 0.065}px ${monoFamily}`;
  context.fillText(`${sticker.batch_label} · Group ${sticker.group}`, centerX, y + side * 0.92);
};

export const renderSheetPng = async ({ stickers, qrCanvases, size, paper, onProgress, signal }: RenderSheetOptions) => {
  const { columns, perPage } = getSheetLayout(size, paper);
  const { widthMm, heightMm } = PAPER[paper];
  const side = toSizeMm(size) * PX_PER_MM;
  const gap = STICKER_GAP_MM * PX_PER_MM;
  const margin = SHEET_MARGIN_MM * PX_PER_MM;

  const monoFamily = getMonoFamily();
  const pages: Blob[] = [];
  let drawn = 0;

  for (const pageStickers of toPages(stickers, perPage)) {
    const canvas = document.createElement('canvas');
    canvas.width = widthMm * PX_PER_MM;
    canvas.height = heightMm * PX_PER_MM;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("This browser can't draw images.");

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (const [slot, sticker] of pageStickers.entries()) {
      if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError');

      const qrCanvas = qrCanvases.get(sticker.code);
      if (!qrCanvas) throw new Error(`The QR for ${sticker.code} isn't ready yet.`);

      const x = margin + (slot % columns) * (side + gap);
      const y = margin + Math.floor(slot / columns) * (side + gap);
      drawSticker(context, sticker, qrCanvas, x, y, side, monoFamily);
      drawn += 1;
      onProgress(drawn, stickers.length);
      await nextFrame();
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error("A page couldn't be turned into a PNG.");
    pages.push(await withPrintResolution(blob));
  }

  return pages;
};

// Browsers drop or block downloads fired in the same tick, so each page waits its turn
const DOWNLOAD_SPACING_MS = 400;
const REVOKE_AFTER_MS = 10_000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_AFTER_MS);
};

export const downloadBlobs = async (files: { blob: Blob; fileName: string }[]) => {
  for (const [index, { blob, fileName }] of files.entries()) {
    if (index > 0) await wait(DOWNLOAD_SPACING_MS);
    downloadBlob(blob, fileName);
  }
};
