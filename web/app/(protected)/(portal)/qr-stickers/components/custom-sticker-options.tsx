'use client';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomCrabPicker from './custom-crab-picker';
import { FILE_TYPE_HINTS, PAPER, STICKER_SIZE_HINTS, toBatchLabel, toPaperDescription } from '../lib/sticker-sheet';
import { fileTypeSchema, paperSchema, stickerSizeSchema } from '../types/qr-stickers';

import type { CrabSelection } from './custom-crab-picker';
import type { Batch, Crab, FileType, Paper, StickerSize } from '../types/qr-stickers';

type CustomStickerOptionsProps = {
  batches: Batch[];
  batch: Batch;
  crabs: Crab[];
  groups: string[];
  selection: CrabSelection;
  size: StickerSize;
  paper: Paper;
  fileType: FileType;
  onBatchChange: (batchId: number) => void;
  onSelectionChange: (selection: CrabSelection) => void;
  onSizeChange: (size: StickerSize) => void;
  onPaperChange: (paper: Paper) => void;
  onFileTypeChange: (fileType: FileType) => void;
};

const SEGMENT_ITEM_CLASS = 'h-11 flex-1 text-sm data-[state=on]:bg-accent data-[state=on]:font-semibold';

const CREATED_FORMAT = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const CustomStickerOptions = ({
  batches,
  batch,
  crabs,
  groups,
  selection,
  size,
  paper,
  fileType,
  onBatchChange,
  onSelectionChange,
  onSizeChange,
  onPaperChange,
  onFileTypeChange,
}: CustomStickerOptionsProps) => {
  const handleSizeChange = (value: string) => {
    const parsed = stickerSizeSchema.safeParse(value);
    if (parsed.success) onSizeChange(parsed.data);
  };

  const handlePaperChange = (value: string) => {
    const parsed = paperSchema.safeParse(value);
    if (parsed.success) onPaperChange(parsed.data);
  };

  const handleFileTypeChange = (value: string) => {
    const parsed = fileTypeSchema.safeParse(value);
    if (parsed.success) onFileTypeChange(parsed.data);
  };

  const handleBatchChange = (value: string) => onBatchChange(Number(value));

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading title="Sticker sheet" />
      <CardContent className="flex flex-col gap-8 px-4 sm:px-6">
        <section aria-labelledby="which-crabs-title" className="flex flex-col gap-5">
          <h3 id="which-crabs-title" className="text-base font-semibold">
            Which crabs
          </h3>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel htmlFor="sticker-batch">Batch</FieldLabel>
              <Select value={String(batch.id)} onValueChange={handleBatchChange}>
                <SelectTrigger id="sticker-batch" className="h-11 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {toBatchLabel(option)}
                      <span className="text-muted-foreground">
                        · started {CREATED_FORMAT.format(new Date(option.created_at))}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <CustomCrabPicker crabs={crabs} groups={groups} selection={selection} onSelectionChange={onSelectionChange} />
          </FieldGroup>
        </section>

        <Separator />

        <section aria-labelledby="sheet-title" className="flex flex-col gap-5">
          <h3 id="sheet-title" className="text-base font-semibold">
            Sheet
          </h3>
          <FieldGroup className="gap-6">
            <Field>
              <FieldLabel id="sticker-size-label">Sticker size</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={size}
                onValueChange={handleSizeChange}
                aria-labelledby="sticker-size-label"
                aria-describedby="sticker-size-hint"
                className="w-full bg-card"
              >
                {stickerSizeSchema.options.map((option) => (
                  <ToggleGroupItem key={option} value={option} className={SEGMENT_ITEM_CLASS}>
                    {option} mm
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id="sticker-size-hint">{STICKER_SIZE_HINTS[size]}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel id="sticker-paper-label">Paper</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={paper}
                onValueChange={handlePaperChange}
                aria-labelledby="sticker-paper-label"
                aria-describedby="sticker-paper-hint"
                className="w-full bg-card"
              >
                {paperSchema.options.map((option) => (
                  <ToggleGroupItem key={option} value={option} className={SEGMENT_ITEM_CLASS}>
                    {PAPER[option].label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id="sticker-paper-hint">{toPaperDescription(paper)}</FieldDescription>
            </Field>

            <Field>
              <FieldLabel id="sticker-file-label">File type</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={fileType}
                onValueChange={handleFileTypeChange}
                aria-labelledby="sticker-file-label"
                aria-describedby="sticker-file-hint"
                className="w-full bg-card"
              >
                {fileTypeSchema.options.map((option) => (
                  <ToggleGroupItem key={option} value={option} className={SEGMENT_ITEM_CLASS}>
                    {option.toUpperCase()}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id="sticker-file-hint">{FILE_TYPE_HINTS[fileType]}</FieldDescription>
            </Field>
          </FieldGroup>
        </section>
      </CardContent>
    </Card>
  );
};

export default CustomStickerOptions;
