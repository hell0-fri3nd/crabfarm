'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import CustomDownloadHistory from './custom-download-history';
import CustomPrintBar from './custom-print-bar';
import CustomPrintSheet from './custom-print-sheet';
import CustomStickerOptions from './custom-sticker-options';
import CustomStickerSheet from './custom-sticker-sheet';
import { downloadBlob, renderSheetPng } from '../lib/render-sheet-png';
import { PAPER, buildStickers, getCrabNumbers, getSheetLayout, pluralize } from '../lib/sticker-sheet';

import type { DownloadProgress } from './custom-print-bar';
import type { Batch, DownloadRecord, FileType, Paper, StickerSize } from '../types/qr-stickers';

type CustomQrStickersWorkspaceProps = {
  batches: Batch[];
  downloads: DownloadRecord[];
};

const DOWNLOADED_AT_FORMAT = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const toCrabsLabel = (group: string, crabNumbers: number[]) => {
  const sorted = [...crabNumbers].sort((left, right) => left - right);
  const isRun = sorted.every((value, index) => index === 0 || value === (sorted[index - 1] ?? value) + 1);
  if (sorted.length > 2 && isRun) return `${group}${sorted[0]}–${group}${sorted.at(-1)}`;
  return sorted.map((value) => `${group}${value}`).join(', ');
};

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const CustomQrStickersWorkspace = ({ batches, downloads }: CustomQrStickersWorkspaceProps) => {
  const [batchCode, setBatchCode] = useState(batches[0]?.code ?? '');
  const [group, setGroup] = useState(batches[0]?.groups[0] ?? 'A');
  const [crabNumbers, setCrabNumbers] = useState(() => (batches[0] ? getCrabNumbers(batches[0]) : []));
  const [size, setSize] = useState<StickerSize>('40');
  const [paper, setPaper] = useState<Paper>('a4');
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [records, setRecords] = useState(downloads);
  const qrCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const abortController = useRef<AbortController | null>(null);

  const batch = batches.find(({ code }) => code === batchCode) ?? batches[0];
  if (!batch) return null;

  const stickers = buildStickers(batch, group, crabNumbers);
  const { perPage } = getSheetLayout(size, paper);
  const pageCount = Math.max(Math.ceil(stickers.length / perPage), 1);
  const paperLabel = PAPER[paper].label;
  const pageSummary = `${pluralize(pageCount, `${paperLabel} page`)}, up to ${perPage} per page`;

  const recordDownload = () => {
    const record: DownloadRecord = {
      id: crypto.randomUUID(),
      batch_code: batch.code,
      group,
      crabs_label: toCrabsLabel(group, crabNumbers),
      sheet_label: `${size} mm, ${paperLabel}`,
      file_type: fileType,
      downloaded_at_label: DOWNLOADED_AT_FORMAT.format(new Date()),
      downloaded_by: 'You',
    };
    setRecords((current) => [record, ...current]);
  };

  const handleBatchChange = (code: string) => {
    const next = batches.find((item) => item.code === code);
    if (!next) return;
    const nextGroup = next.groups.includes(group) ? group : (next.groups[0] ?? 'A');
    setBatchCode(code);
    setGroup(nextGroup);
    setCrabNumbers(getCrabNumbers(next));
  };

  const handleGroupChange = (nextGroup: string) => {
    setGroup(nextGroup);
    setCrabNumbers(getCrabNumbers(batch));
  };

  const handlePrint = () => {
    window.addEventListener('afterprint', recordDownload, { once: true });
    notify.info('Print dialog opened', {
      description: 'Choose “Save as PDF” and set scale to 100% so stickers come out at true size.',
    });
    window.print();
  };

  const handlePng = async () => {
    const controller = new AbortController();
    abortController.current = controller;
    setProgress({ done: 0, total: stickers.length });
    try {
      const blob = await renderSheetPng({
        stickers,
        qrCanvases: qrCanvases.current,
        size,
        paper,
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const fileName = `${batch.code}-group-${group}-stickers.png`;
      downloadBlob(blob, fileName);
      recordDownload();
      notify.success(`${pluralize(stickers.length, 'sticker')} downloaded`, { description: fileName });
    } catch (error) {
      if (isAbortError(error)) {
        notify.info('Download cancelled', { description: 'Nothing was saved.' });
        return;
      }
      notify.error("Couldn't make the sticker sheet", {
        description: `${error instanceof Error ? error.message : 'Something went wrong.'} Try again.`,
      });
    } finally {
      abortController.current = null;
      setProgress(null);
    }
  };

  const handleDownload = () => (fileType === 'pdf' ? handlePrint() : void handlePng());

  const handleCancel = () => abortController.current?.abort();

  const handleNewBatch = () =>
    notify.info("Adding a batch isn't connected yet", {
      description: 'New batches will be created here once the API is wired up.',
    });

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="QR stickers"
        status={`${batch.code} · ${batch.tagged_count} crabs tagged so far`}
        actions={
          <Button type="button" variant="outline" className="h-11 bg-card/60 px-5" onClick={handleNewBatch}>
            <Plus aria-hidden />
            New batch
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <CustomStickerOptions
            batches={batches}
            batch={batch}
            group={group}
            crabNumbers={crabNumbers}
            size={size}
            paper={paper}
            fileType={fileType}
            onBatchChange={handleBatchChange}
            onGroupChange={handleGroupChange}
            onCrabNumbersChange={setCrabNumbers}
            onSizeChange={setSize}
            onPaperChange={setPaper}
            onFileTypeChange={setFileType}
          />
          <CustomPrintBar
            stickerCount={stickers.length}
            pageSummary={pageSummary}
            fileType={fileType}
            progress={progress}
            onDownload={handleDownload}
            onCancel={handleCancel}
          />
        </div>
        <CustomStickerSheet stickers={stickers} sheetLabel={`${paperLabel} · ${size} mm`} />
      </div>

      <CustomDownloadHistory records={records} />

      {/* Off-screen source canvases for the PNG; fixed + 1px so they never widen the page */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-0 size-px overflow-hidden opacity-0">
        {stickers.map(({ code }) => (
          <QRCodeCanvas
            key={code}
            value={code}
            size={512}
            level="M"
            marginSize={0}
            ref={(node) => {
              if (!node) return;
              qrCanvases.current.set(code, node);
              return () => {
                qrCanvases.current.delete(code);
              };
            }}
          />
        ))}
      </div>

      <CustomPrintSheet stickers={stickers} size={size} paper={paper} />
    </div>
  );
};

export default CustomQrStickersWorkspace;
