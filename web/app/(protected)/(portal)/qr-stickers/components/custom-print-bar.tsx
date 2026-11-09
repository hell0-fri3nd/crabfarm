import { Download, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { pluralize } from '../lib/sticker-sheet';

import type { FileType } from '../types/qr-stickers';

export type DownloadProgress = {
  done: number;
  total: number;
};

type CustomPrintBarProps = {
  stickerCount: number;
  pageSummary: string;
  fileType: FileType;
  progress: DownloadProgress | null;
  onDownload: () => void;
  onCancel: () => void;
};

const CustomPrintBar = ({ stickerCount, pageSummary, fileType, progress, onDownload, onCancel }: CustomPrintBarProps) => {
  const isEmpty = stickerCount === 0;

  return (
    <Card className="sticky bottom-24 z-10 gap-4 rounded-2xl px-4 py-4 shadow-lg sm:px-6 sm:py-5 md:static md:shadow-sm print:hidden">
      {progress ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-semibold tabular-nums">
              Drawing sticker {progress.done} of {progress.total}…
            </p>
            <Button type="button" variant="ghost" size="sm" className="h-9 text-muted-foreground" onClick={onCancel}>
              <X aria-hidden />
              Cancel
            </Button>
          </div>
          <Progress
            value={(progress.done / progress.total) * 100}
            aria-label="Sticker sheet progress"
            className="h-2"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-base font-semibold">{pluralize(stickerCount, 'sticker')}</p>
            <p id="print-bar-summary" className="text-sm text-muted-foreground">
              {isEmpty ? 'Pick at least one crab to download its sticker.' : pageSummary}
            </p>
          </div>
          <Button
            type="button"
            className="h-11 w-full px-5 sm:w-auto"
            disabled={isEmpty}
            aria-describedby="print-bar-summary"
            onClick={onDownload}
          >
            <Download aria-hidden />
            Download {fileType.toUpperCase()}
          </Button>
        </div>
      )}
    </Card>
  );
};

export default CustomPrintBar;
