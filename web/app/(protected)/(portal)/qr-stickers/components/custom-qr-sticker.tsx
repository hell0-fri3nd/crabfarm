import { QRCodeSVG } from 'qrcode.react';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import { CUT_LINE, QR_LEVEL, toQrLogo } from '../lib/sticker-sheet';

import type { Sticker } from '../types/qr-stickers';

type CustomQrStickerProps = {
  sticker: Sticker;
  style?: CSSProperties;
  className?: string;
};

const QR_SVG_SIZE = 256;

// Printed on white vinyl, so the sticker keeps print colours and sizes everything from its own width (03 §7 exception).
// The box has no padding or radius of its own: those would resolve against the parent container, not the sticker.
const CustomQrSticker = ({ sticker, style, className }: CustomQrStickerProps) => (
  <figure
    style={style}
    className={cn('@container relative aspect-square w-full bg-white text-neutral-950 print:break-inside-avoid', className)}
  >
    <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full text-neutral-300">
      <rect
        x={CUT_LINE.width / 2}
        y={CUT_LINE.width / 2}
        width={100 - CUT_LINE.width}
        height={100 - CUT_LINE.width}
        rx={CUT_LINE.radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={CUT_LINE.width}
        strokeDasharray={`${CUT_LINE.dash} ${CUT_LINE.gap}`}
      />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw]">
      <QRCodeSVG
        value={sticker.code}
        size={QR_SVG_SIZE}
        level={QR_LEVEL}
        marginSize={0}
        imageSettings={toQrLogo(QR_SVG_SIZE)}
        title={`QR code for crab ${sticker.code}`}
        className="h-auto w-[62cqw]"
      />
      <figcaption className="flex flex-col items-center gap-[2cqw]">
        <span className="font-mono text-[11cqw] leading-none font-bold tracking-wider">{sticker.code}</span>
        <span className="text-[6.5cqw] leading-none text-neutral-600">
          {sticker.batch_label} · Group {sticker.group}
        </span>
      </figcaption>
    </div>
  </figure>
);

export default CustomQrSticker;
