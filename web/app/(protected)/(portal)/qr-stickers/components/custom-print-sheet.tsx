'use client';

import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import CustomQrSticker from './custom-qr-sticker';
import { PAPER, SHEET_MARGIN_MM, STICKER_GAP_MM, getSheetLayout, toSizeMm } from '../lib/sticker-sheet';

import type { Paper, Sticker, StickerSize } from '../types/qr-stickers';

type CustomPrintSheetProps = {
  stickers: Sticker[];
  size: StickerSize;
  paper: Paper;
};

const PRINT_SHEET_ID = 'qr-print-sheet';

const subscribe = () => () => undefined;
const getIsMounted = () => true;
const getServerIsMounted = () => false;

const chunk = <T,>(items: T[], size: number) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));

const CustomPrintSheet = ({ stickers, size, paper }: CustomPrintSheetProps) => {
  const isMounted = useSyncExternalStore(subscribe, getIsMounted, getServerIsMounted);
  if (!isMounted || stickers.length === 0) return null;

  const { widthMm, heightMm } = PAPER[paper];
  const { columns, perPage } = getSheetLayout(size, paper);
  const sizeMm = toSizeMm(size);

  // Only the sticker sheet prints, at true millimetre size; everything else in the app is hidden from the printer
  const printCss = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
@media print {
  body * { visibility: hidden !important; }
  #${PRINT_SHEET_ID}, #${PRINT_SHEET_ID} * { visibility: visible !important; }
  #${PRINT_SHEET_ID} { position: absolute; top: 0; left: 0; }
}`;

  return createPortal(
    <div id={PRINT_SHEET_ID} aria-hidden className="hidden print:block">
      <style>{printCss}</style>
      {chunk(stickers, perPage).map((page) => (
        <section
          key={page[0]?.code}
          className="box-border break-after-page bg-white"
          style={{ width: `${widthMm}mm`, height: `${heightMm}mm`, padding: `${SHEET_MARGIN_MM}mm` }}
        >
          <div
            className="grid"
            style={{ gridTemplateColumns: `repeat(${columns}, ${sizeMm}mm)`, gap: `${STICKER_GAP_MM}mm` }}
          >
            {page.map((sticker) => (
              <CustomQrSticker key={sticker.code} sticker={sticker} style={{ width: `${sizeMm}mm` }} />
            ))}
          </div>
        </section>
      ))}
    </div>,
    document.body,
  );
};

export default CustomPrintSheet;
