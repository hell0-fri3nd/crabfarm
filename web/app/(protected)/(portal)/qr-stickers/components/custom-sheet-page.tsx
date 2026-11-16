import CustomQrSticker from './custom-qr-sticker';
import { PAPER, SHEET_MARGIN_MM, STICKER_GAP_MM, getSheetLayout, toSizeMm } from '../lib/sticker-sheet';

import type { Paper, Sticker, StickerSize } from '../types/qr-stickers';

type CustomSheetPageProps = {
  stickers: Sticker[];
  size: StickerSize;
  paper: Paper;
  pageNumber: number;
  pageCount: number;
};

const SCALE_BAR_MM = 10;

// Every length is a share of the paper width in cqw, so the page, gaps and stickers keep their printed proportions
const CustomSheetPage = ({ stickers, size, paper, pageNumber, pageCount }: CustomSheetPageProps) => {
  const { label, widthMm, heightMm } = PAPER[paper];
  const { columns } = getSheetLayout(size, paper);
  const toWidthShare = (mm: number) => `${(mm / widthMm) * 100}cqw`;

  return (
    <li className="@container flex w-full max-w-sm flex-col gap-3 self-center md:max-w-md xl:max-w-lg">
      <div
        className="w-full rounded-md bg-white shadow-sm ring-1 ring-border"
        style={{ aspectRatio: `${widthMm} / ${heightMm}`, padding: toWidthShare(SHEET_MARGIN_MM) }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, ${toWidthShare(toSizeMm(size))})`,
            gap: toWidthShare(STICKER_GAP_MM),
          }}
        >
          {stickers.map((sticker) => (
            <CustomQrSticker key={sticker.code} sticker={sticker} />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 text-xs font-medium text-muted-foreground">
        <span>
          {label} page {pageNumber} of {pageCount}
        </span>
        <span className="flex items-center gap-2" aria-label={`Scale: the bar is ${SCALE_BAR_MM} mm on paper`}>
          <span
            aria-hidden
            className="h-1.5 border-x-2 border-b-2 border-muted-foreground"
            style={{ width: toWidthShare(SCALE_BAR_MM) }}
          />
          {SCALE_BAR_MM} mm
        </span>
      </div>
    </li>
  );
};

export default CustomSheetPage;
