import { z } from 'zod';

import type { Batch, Crab } from '@/types/crab-management';

const STICKER_CODE_PATTERN = /^B(\d{1,6})-?([A-Z])-?(\d{1,3})$/;
const DECIMAL_PATTERN = /^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/;
const LISTED_BATCHES = 4;

const stickerCodeSchema = z
  .string()
  .transform((raw) => raw.replace(/\s+/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .min(1, 'Type the code printed under the QR, like B1-A1.')
      .regex(STICKER_CODE_PATTERN, "That isn't a crab code. It looks like B1-A1: the batch, then the crab."),
  )
  .transform((code) => {
    const [, batchNumber = '0', group = 'A', crabNumber = '0'] = STICKER_CODE_PATTERN.exec(code) ?? [];
    return { batch_id: Number(batchNumber), crab_name: `${group}${Number(crabNumber)}` };
  });

const compareNames = new Intl.Collator('en', { numeric: true }).compare;

const toBatchOptions = (batches: Batch[]) => {
  const ids = batches.map(({ id }) => id).sort((left, right) => left - right);
  if (ids.length > LISTED_BATCHES) return `B${ids[0]} to B${ids.at(-1)}`;
  return ids.map((id) => `B${id}`).join(ids.length === 2 ? ' or ' : ', ');
};

const toMissingBatchMessage = (batchId: number, batches: Batch[]) =>
  batches.length === 0
    ? 'There are no batches yet. Create one on QR stickers first.'
    : `There's no Batch ${batchId} yet. Codes start with ${toBatchOptions(batches)}.`;

const toMissingCrabMessage = (crabName: string, crabs: Crab[]) => {
  const names = crabs.map(({ name }) => name).sort(compareNames);
  return names.length === 0
    ? 'There are no crabs set up yet.'
    : `There's no crab ${crabName}. Crabs run ${names[0]} to ${names.at(-1)}.`;
};

export const buildStickerSchema = (batches: Batch[], crabs: Crab[]) =>
  stickerCodeSchema.transform(({ batch_id, crab_name }, context) => {
    const batch = batches.find(({ id }) => id === batch_id);
    const crab = crabs.find(({ name }) => name === crab_name);

    if (!batch || !crab) {
      context.issues.push({
        code: 'custom',
        input: `B${batch_id}-${crab_name}`,
        message: batch ? toMissingCrabMessage(crab_name, crabs) : toMissingBatchMessage(batch_id, batches),
      });
      return z.NEVER;
    }

    return {
      code: `B${batch.id}-${crab.name}`,
      batch_id: batch.id,
      batch_label: `Batch ${batch.id}`,
      crab_id: crab.id,
      crab_name: crab.name,
      group: crab.group_by,
    };
  });

export type ScannedSticker = z.output<ReturnType<typeof buildStickerSchema>>;

export const buildManualCodeFormSchema = (batches: Batch[], crabs: Crab[]) =>
  z.object({ code: buildStickerSchema(batches, crabs) });
export type ManualCodeFormInput = z.input<ReturnType<typeof buildManualCodeFormSchema>>;
export type ManualCodeFormOutput = z.output<ReturnType<typeof buildManualCodeFormSchema>>;

const capitalize = (text: string) => `${text[0]?.toUpperCase() ?? ''}${text.slice(1)}`;

const decimalField = (label: string, unit: string, max: number, example: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .transform((raw) => raw.replace(',', '.'))
    .pipe(
      z.string().regex(DECIMAL_PATTERN, `${capitalize(label)} must be a number with up to 2 decimals, like ${example}.`),
    )
    .transform(Number)
    .pipe(
      z
        .number()
        .gt(0, `${capitalize(label)} must be more than 0 ${unit}.`)
        .max(max, `${max} ${unit} is more than any crab here. Check the reading.`),
    );

export const measurementSchema = z.object({
  weight_g: decimalField('weight', 'g', 2000, '182.4'),
  width_mm: decimalField('width', 'mm', 300, '87.5'),
});
export type MeasurementInput = z.input<typeof measurementSchema>;
export type MeasurementOutput = z.output<typeof measurementSchema>;

export const createLogSchema = z.object({
  crab_id: z.number().int().positive(),
  batch_id: z.number().int().positive(),
  weight_g: z.number().gt(0, 'Weight must be more than 0 g.').max(5000, 'Weight must be 5000 g or less.'),
  width_mm: z.number().gt(0, 'Width must be more than 0 mm.').max(300, 'Width must be 300 mm or less.'),
});
export type CreateLogInput = z.infer<typeof createLogSchema>;

const apiDecimalSchema = z.union([z.string(), z.number()]).pipe(z.coerce.number());

export const logSchema = z.object({
  id: z.number().int().positive(),
  batch_id: z.number().int().positive().nullable(),
  crab_id: z.number().int().positive(),
  width_mm: apiDecimalSchema.nullable(),
  weight_g: apiDecimalSchema.nullable(),
});
export type Log = z.infer<typeof logSchema>;

export const logCountSchema = z.object({ total: z.number().int().nonnegative() });

export const logCreatedEventSchema = z.object({
  id: z.uuid(),
  occurred_at: z.iso.datetime({ offset: true }),
  actor_id: z.uuid().nullable(),
  actor_email: z.string().nullable(),
  changes: z.object({ after: logSchema }),
});
export type LogCreatedEvent = z.infer<typeof logCreatedEventSchema>;

export const logCreatedPageSchema = z.object({
  items: z.array(logCreatedEventSchema),
  total: z.number().int(),
});

export const recentLogSchema = z.object({
  id: z.string(),
  code: z.string(),
  weight_label: z.string(),
  width_label: z.string(),
  logged_at_label: z.string(),
  logged_by: z.string(),
});
export type RecentLog = z.infer<typeof recentLogSchema>;

export const barcodeResultsSchema = z.array(z.object({ rawValue: z.string() }));
