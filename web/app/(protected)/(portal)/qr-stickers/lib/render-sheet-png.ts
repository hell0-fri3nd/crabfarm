import { PAPER, SHEET_MARGIN_MM, STICKER_GAP_MM, getSheetLayout, toSizeMm } from './sticker-sheet';

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
const BRAND_INK = '#0a7652';
const CUT_LINE = '#c9d6ce';

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Couldn't load ${src}`));
    image.src = src;
  });

const getMonoFamily = () =>
  getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim() || 'ui-monospace, monospace';

const drawSticker = (
  context: CanvasRenderingContext2D,
  sticker: Sticker,
  qrCanvas: HTMLCanvasElement,
  mark: HTMLImageElement,
  x: number,
  y: number,
  side: number,
  monoFamily: string,
) => {
  context.save();
  context.strokeStyle = CUT_LINE;
  context.lineWidth = 2;
  context.setLineDash([10, 8]);
  context.beginPath();
  context.roundRect(x, y, side, side, side * 0.06);
  context.stroke();
  context.restore();

  const qrSide = side * 0.58;
  context.imageSmoothingEnabled = false;
  context.drawImage(qrCanvas, x + (side - qrSide) / 2, y + side * 0.07, qrSide, qrSide);

  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const centerX = x + side / 2;

  context.fillStyle = INK;
  context.font = `700 ${side * 0.1}px ${monoFamily}`;
  context.fillText(sticker.code, centerX, y + side * 0.78);

  context.fillStyle = MUTED_INK;
  context.font = `500 ${side * 0.062}px ${monoFamily}`;
  context.fillText(`${sticker.batch_code} · Group ${sticker.group}`, centerX, y + side * 0.87);

  const markSide = side * 0.07;
  context.fillStyle = BRAND_INK;
  context.font = `700 ${side * 0.058}px sans-serif`;
  const brandWidth = context.measureText('CrabFarm').width;
  const brandX = centerX - (brandWidth + markSide * 1.3) / 2;
  context.drawImage(mark, brandX, y + side * 0.9, markSide, markSide);
  context.textAlign = 'left';
  context.fillText('CrabFarm', brandX + markSide * 1.3, y + side * 0.955);
};

export const renderSheetPng = async ({ stickers, qrCanvases, size, paper, onProgress, signal }: RenderSheetOptions) => {
  const { columns, perPage } = getSheetLayout(size, paper);
  const { widthMm, heightMm } = PAPER[paper];
  const pageCount = Math.max(Math.ceil(stickers.length / perPage), 1);
  const pageWidth = widthMm * PX_PER_MM;
  const pageHeight = heightMm * PX_PER_MM;
  const side = toSizeMm(size) * PX_PER_MM;
  const gap = STICKER_GAP_MM * PX_PER_MM;
  const margin = SHEET_MARGIN_MM * PX_PER_MM;

  const canvas = document.createElement('canvas');
  canvas.width = pageWidth;
  canvas.height = pageHeight * pageCount;
  const context = canvas.getContext('2d');
  if (!context) throw new Error("This browser can't draw images.");

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const mark = await loadImage('/brand/crabfarm-mark.svg');
  const monoFamily = getMonoFamily();

  for (const [index, sticker] of stickers.entries()) {
    if (signal.aborted) throw new DOMException('Download cancelled', 'AbortError');

    const qrCanvas = qrCanvases.get(sticker.code);
    if (!qrCanvas) throw new Error(`The QR for ${sticker.code} isn't ready yet.`);

    const page = Math.floor(index / perPage);
    const slot = index % perPage;
    const x = margin + (slot % columns) * (side + gap);
    const y = page * pageHeight + margin + Math.floor(slot / columns) * (side + gap);

    drawSticker(context, sticker, qrCanvas, mark, x, y, side, monoFamily);
    onProgress(index + 1, stickers.length);
    await nextFrame();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error("The sheet couldn't be turned into a PNG.");
  return blob;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
