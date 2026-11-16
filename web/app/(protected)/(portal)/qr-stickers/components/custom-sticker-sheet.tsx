import { QrCode } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import CustomSheetPage from './custom-sheet-page';
import { getSheetLayout, toPages } from '../lib/sticker-sheet';

import type { Paper, Sticker, StickerSize } from '../types/qr-stickers';

type CustomStickerSheetProps = {
  stickers: Sticker[];
  size: StickerSize;
  paper: Paper;
  sheetLabel: string;
};

const CustomStickerSheet = ({ stickers, size, paper, sheetLabel }: CustomStickerSheetProps) => {
  const pages = toPages(stickers, getSheetLayout(size, paper).perPage);
  // Only a one-page preview stays in view: a taller sticky card would hide its own lower pages
  const isSticky = pages.length === 1;

  return (
  <Card className={cn('gap-5 rounded-2xl py-5 sm:py-6', isSticky && 'lg:sticky lg:top-24')}>
    <CustomCardHeading
      title="Preview"
      description="Drawn to scale on the paper you picked. Each code holds the batch and the crab, like B3-A1."
      actions={
        <Badge variant="outline" className="h-7 px-2.5 text-xs font-semibold">
          {sheetLabel}
        </Badge>
      }
    />
    <CardContent className="px-4 sm:px-6">
      {stickers.length === 0 ? (
        <CustomEmptyState
          icon={QrCode}
          title="No crabs picked"
          hint="Pick at least one crab under Which crabs to see its sticker here."
          className="rounded-xl border border-dashed border-border"
        />
      ) : (
        <ul aria-label={`${stickers.length} sticker preview on ${pages.length} pages`} className="flex flex-col gap-6">
          {pages.map((page, index) => (
            <CustomSheetPage
              key={page[0]?.code}
              stickers={page}
              size={size}
              paper={paper}
              pageNumber={index + 1}
              pageCount={pages.length}
            />
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
  );
};

export default CustomStickerSheet;
