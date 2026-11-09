import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

import type { CSSProperties } from 'react';

import { cn } from '@/lib/utils';

import type { Sticker } from '../types/qr-stickers';

type CustomQrStickerProps = {
  sticker: Sticker;
  style?: CSSProperties;
  className?: string;
};

// Printed on white vinyl, so the sticker keeps print colours and scales its type with the sticker (03 §7 exception)
const CustomQrSticker = ({ sticker, style, className }: CustomQrStickerProps) => (
  <figure
    style={style}
    className={cn(
      '@container flex aspect-square w-full flex-col items-center justify-center rounded-[6cqw] border border-dashed border-neutral-300 bg-white p-[5cqw] text-neutral-950 print:break-inside-avoid',
      className,
    )}
  >
    <QRCodeSVG
      value={sticker.code}
      level="M"
      marginSize={0}
      title={`QR code for crab ${sticker.code}`}
      className="h-auto w-[58cqw]"
    />
    <figcaption className="mt-[5cqw] flex flex-col items-center gap-[2cqw]">
      <span className="font-mono text-[10cqw] leading-none font-bold tracking-wider">{sticker.code}</span>
      <span className="text-[6cqw] leading-none text-neutral-600">
        {sticker.batch_code} · Group {sticker.group}
      </span>
      <span className="flex items-center gap-[1.5cqw] text-[5.5cqw] leading-none font-bold text-emerald-800">
        <Image src="/brand/crabfarm-mark.svg" alt="" width={12} height={12} className="h-[6cqw] w-auto" />
        CrabFarm
      </span>
    </figcaption>
  </figure>
);

export default CustomQrSticker;
