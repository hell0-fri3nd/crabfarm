'use client';

import { useRef, useState } from 'react';
import { Plus, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { notify } from '@/lib/notify';

import CustomDownloadHistory from './custom-download-history';
import CustomPrintBar from './custom-print-bar';
import CustomPrintSheet from './custom-print-sheet';
import CustomStickerOptions from './custom-sticker-options';
import CustomStickerSheet from './custom-sticker-sheet';
import { createBatch } from '../actions/create-batch';
import { recordStickerDownload } from '../actions/record-sticker-download';
import { RECENT_DOWNLOADS, toCrabsLabel, toDownloadedAtLabel } from '../lib/download-history';
import { downloadBlobs, renderSheetPng } from '../lib/render-sheet-png';
import {
  PAPER,
  QR_LEVEL,
  buildStickers,
  getGroupCrabs,
  getGroups,
  getSheetLayout,
  pluralize,
  toBatchLabel,
  toPaperDescription,
  toQrLogo,
  toSizeMm,
} from '../lib/sticker-sheet';

import type { CrabSelection } from './custom-crab-picker';
import type { DownloadProgress } from './custom-print-bar';
import type { Batch, Crab, DownloadRecord, FileType, Paper, StickerSize } from '../types/qr-stickers';

export type DownloadHistory = {
  records: DownloadRecord[];
  total: number;
  isEveryone: boolean;
  error: string | null;
};

type CustomQrStickersWorkspaceProps = {
  initialBatches: Batch[];
  crabs: Crab[];
  initialHistory: DownloadHistory;
  canCreateBatch: boolean;
};

const toIds = (crabs: Crab[]) => crabs.map(({ id }) => id);

const QR_CANVAS_SIZE = 512;

const isAbortError = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

const CustomQrStickersWorkspace = ({ initialBatches, crabs, initialHistory, canCreateBatch }: CustomQrStickersWorkspaceProps) => {
  const groups = getGroups(crabs);
  const [batches, setBatches] = useState(initialBatches);
  const [batchId, setBatchId] = useState(initialBatches[0]?.id);
  const [selection, setSelection] = useState<CrabSelection>(() => {
    const firstGroups = groups.slice(0, 1);
    return { groups: firstGroups, crabIds: toIds(firstGroups.flatMap((group) => getGroupCrabs(crabs, group))) };
  });
  const [size, setSize] = useState<StickerSize>('40');
  const [paper, setPaper] = useState<Paper>('a4');
  const [fileType, setFileType] = useState<FileType>('pdf');
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [history, setHistory] = useState(initialHistory);
  const qrCanvases = useRef(new Map<string, HTMLCanvasElement>());
  const abortController = useRef<AbortController | null>(null);

  const batch = batches.find(({ id }) => id === batchId) ?? batches[0];
  const pickedCrabs = crabs.filter(({ id }) => selection.crabIds.includes(id));
  const groupsLabel = selection.groups.join(', ');

  const handleNewBatch = async () => {
    setIsCreating(true);
    const result = await createBatch();
    setIsCreating(false);

    if (!result.ok) {
      notify.error("Couldn't start a new batch", { description: result.message });
      return;
    }
    setBatches((current) => [result.data, ...current]);
    setBatchId(result.data.id);
    notify.success(`${toBatchLabel(result.data)} started`, { description: 'Its stickers are ready to download.' });
  };

  // Hidden, not disabled, for roles that can't start a batch: a product decision over 03 §16
  const newBatchButton = canCreateBatch && (
    <Button
      type="button"
      variant="outline"
      className="h-11 bg-card/60 px-5"
      disabled={isCreating}
      aria-busy={isCreating}
      onClick={handleNewBatch}
    >
      <Plus aria-hidden />
      {isCreating ? 'Starting…' : 'New batch'}
    </Button>
  );

  const noBatchHint = canCreateBatch
    ? 'Each sticker names its batch, so make one first with New batch.'
    : 'Each sticker names its batch. Ask an admin to start one.';

  if (!batch || groups.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <CustomPageHeader title="QR stickers" status={batch ? 'No crabs yet' : 'No batches yet'} actions={newBatchButton} />
        <Card className="py-0">
          <CustomEmptyState
            icon={QrCode}
            title={batch ? 'No crabs to label yet' : 'Start a batch to print stickers'}
            hint={
              batch
                ? 'Crabs show up here once they are added to the farm.'
                : noBatchHint
            }
          />
        </Card>
      </div>
    );
  }

  const stickers = buildStickers(batch, pickedCrabs);
  const { perPage } = getSheetLayout(size, paper);
  const pageCount = Math.max(Math.ceil(stickers.length / perPage), 1);
  const paperLabel = PAPER[paper].label;
  const pageSummary = `${pluralize(pageCount, `${paperLabel} page`)}, up to ${perPage} per page`;

  const addHistoryRecord = () => {
    const record: DownloadRecord = {
      id: crypto.randomUUID(),
      batch_label: toBatchLabel(batch),
      group: groupsLabel,
      crabs_label: toCrabsLabel(pickedCrabs.map(({ name }) => name)),
      sheet_label: `${size} mm, ${paperLabel}`,
      file_type: fileType,
      downloaded_at_label: toDownloadedAtLabel(new Date()),
      downloaded_by: 'You',
    };
    setHistory((current) => ({
      ...current,
      records: [record, ...current.records].slice(0, RECENT_DOWNLOADS),
      total: current.total + 1,
    }));
  };

  const handlePrint = () => {
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
      const pages = await renderSheetPng({
        stickers,
        qrCanvases: qrCanvases.current,
        size,
        paper,
        signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const baseName = `${toBatchLabel(batch).replace(' ', '-')}-group-${selection.groups.join('')}-${paper}-${size}mm`;
      await downloadBlobs(
        pages.map((blob, index) => ({
          blob,
          fileName: pages.length === 1 ? `${baseName}.png` : `${baseName}-page-${index + 1}-of-${pages.length}.png`,
        })),
      );
      notify.success(`${pluralize(stickers.length, 'sticker')} downloaded`, {
        description: `${pluralize(pages.length, 'PNG')}, one per ${toPaperDescription(paper)} page at 300 dpi. Print at 100% scale.`,
      });
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

  const handleDownload = async () => {
    setIsChecking(true);
    const result = await recordStickerDownload({
      batch_id: batch.id,
      crab_ids: toIds(pickedCrabs),
      file_type: fileType,
      sticker_size_mm: toSizeMm(size),
      paper,
    });
    setIsChecking(false);

    if (!result.ok) {
      notify.error(`Couldn't download the ${fileType.toUpperCase()}`, { description: result.message });
      return;
    }
    addHistoryRecord();
    if (fileType === 'pdf') {
      handlePrint();
      return;
    }
    await handlePng();
  };

  const handleCancel = () => abortController.current?.abort();

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="QR stickers"
        status={`${toBatchLabel(batch)} · ${pluralize(crabs.length, 'crab')} in ${pluralize(groups.length, 'group')}`}
        actions={newBatchButton}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <CustomStickerOptions
            batches={batches}
            batch={batch}
            crabs={crabs}
            groups={groups}
            selection={selection}
            size={size}
            paper={paper}
            fileType={fileType}
            onBatchChange={setBatchId}
            onSelectionChange={setSelection}
            onSizeChange={setSize}
            onPaperChange={setPaper}
            onFileTypeChange={setFileType}
          />
          <CustomPrintBar
            stickerCount={stickers.length}
            pageSummary={pageSummary}
            fileType={fileType}
            progress={progress}
            isChecking={isChecking}
            onDownload={() => void handleDownload()}
            onCancel={handleCancel}
          />
        </div>
        <CustomStickerSheet stickers={stickers} size={size} paper={paper} sheetLabel={`${paperLabel} · ${size} mm`} />
      </div>

      <CustomDownloadHistory history={history} />

      {/* Off-screen source canvases for the PNG; fixed + 1px so they never widen the page */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-0 size-px overflow-hidden opacity-0">
        {stickers.map(({ code }) => (
          <QRCodeCanvas
            key={code}
            value={code}
            size={QR_CANVAS_SIZE}
            level={QR_LEVEL}
            marginSize={0}
            imageSettings={toQrLogo(QR_CANVAS_SIZE)}
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
