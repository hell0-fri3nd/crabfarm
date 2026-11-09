import { QrCode } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

import CustomQrSticker from './custom-qr-sticker';

import type { Sticker } from '../types/qr-stickers';

type CustomStickerSheetProps = {
  stickers: Sticker[];
  sheetLabel: string;
};

const CustomStickerSheet = ({ stickers, sheetLabel }: CustomStickerSheetProps) => (
  <Card className="gap-5 rounded-2xl py-5 sm:py-6">
    <CustomCardHeading
      title="Preview"
      description="Each code holds only batch, group and crab number."
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
        <ul
          aria-label={`${stickers.length} sticker preview`}
          className="grid grid-cols-2 gap-3 rounded-xl bg-white p-3 sm:grid-cols-3 sm:p-5"
        >
          {stickers.map((sticker) => (
            <li key={sticker.code}>
              <CustomQrSticker sticker={sticker} />
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

export default CustomStickerSheet;
