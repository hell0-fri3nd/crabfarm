'use client';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import {
  FILE_TYPE_HINTS,
  PAPER,
  STICKER_SIZE_HINTS,
  getCrabNumbers,
  toPaperDescription,
} from '../lib/sticker-sheet';
import { fileTypeSchema, paperSchema, stickerSizeSchema } from '../types/qr-stickers';

import type { Batch, FileType, Paper, StickerSize } from '../types/qr-stickers';

type CustomStickerOptionsProps = {
  batches: Batch[];
  batch: Batch;
  group: string;
  crabNumbers: number[];
  size: StickerSize;
  paper: Paper;
  fileType: FileType;
  onBatchChange: (code: string) => void;
  onGroupChange: (group: string) => void;
  onCrabNumbersChange: (numbers: number[]) => void;
  onSizeChange: (size: StickerSize) => void;
  onPaperChange: (paper: Paper) => void;
  onFileTypeChange: (fileType: FileType) => void;
};

const SEGMENT_ITEM_CLASS = 'h-11 flex-1 text-sm data-[state=on]:bg-accent data-[state=on]:font-semibold';

const CustomStickerOptions = ({
  batches,
  batch,
  group,
  crabNumbers,
  size,
  paper,
  fileType,
  onBatchChange,
  onGroupChange,
  onCrabNumbersChange,
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

  const handleGroupChange = (value: string) => {
    if (value) onGroupChange(value);
  };

  const handleCrabsChange = (values: string[]) => onCrabNumbersChange(values.map(Number));

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
              <Select value={batch.code} onValueChange={onBatchChange}>
                <SelectTrigger id="sticker-batch" className="h-11 w-full bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(({ code, tagged_count }) => (
                    <SelectItem key={code} value={code}>
                      {code}
                      <span className="text-muted-foreground">· {tagged_count} tagged</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel id="sticker-group-label">Group</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                value={group}
                onValueChange={handleGroupChange}
                aria-labelledby="sticker-group-label"
                className="w-full bg-card"
              >
                {batch.groups.map((option) => (
                  <ToggleGroupItem key={option} value={option} className={SEGMENT_ITEM_CLASS}>
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>

            <Field>
              <FieldLabel id="sticker-crabs-label">Crabs</FieldLabel>
              <ToggleGroup
                type="multiple"
                variant="outline"
                spacing={2}
                value={crabNumbers.map(String)}
                onValueChange={handleCrabsChange}
                aria-labelledby="sticker-crabs-label"
                aria-describedby="sticker-crabs-hint"
                className="flex-wrap justify-start"
              >
                {getCrabNumbers(batch).map((crabNumber) => (
                  <ToggleGroupItem
                    key={crabNumber}
                    value={String(crabNumber)}
                    className="h-11 min-w-13 rounded-full border-border bg-card px-4 font-mono text-sm font-semibold text-muted-foreground shadow-none data-[state=on]:border-primary/60 data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {group}
                    {crabNumber}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription id="sticker-crabs-hint">
                {crabNumbers.length} of {batch.crabs_per_group} picked. Tap a crab to leave it out.
              </FieldDescription>
            </Field>
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
