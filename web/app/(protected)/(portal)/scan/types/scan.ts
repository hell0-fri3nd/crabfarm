import { z } from 'zod';

const CRAB_CODE_PATTERN = /^B(\d{1,3})-?([A-Z])-?(\d{1,3})$/;

export const crabCodeSchema = z
  .string()
  .transform((raw) => raw.replace(/\s+/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .min(1, 'Type the code printed under the QR, like B3-B-02.')
      .regex(CRAB_CODE_PATTERN, "That isn't a crab code. It looks like B3-B-02: batch, group, crab."),
  )
  .transform((code) => {
    const [, batchNumber = '0', group = 'A', crabNumber = '0'] = CRAB_CODE_PATTERN.exec(code) ?? [];
    return {
      code: `B${Number(batchNumber)}-${group}-${crabNumber.padStart(2, '0')}`,
      batch_code: `BATCH-${Number(batchNumber)}`,
      group,
      crab_number: Number(crabNumber),
    };
  });

export type ScannedSticker = z.output<typeof crabCodeSchema>;

export const manualCodeFormSchema = z.object({ code: crabCodeSchema });
export type ManualCodeFormInput = z.input<typeof manualCodeFormSchema>;
export type ManualCodeFormOutput = z.output<typeof manualCodeFormSchema>;

const decimalField = (label: string, unit: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .transform((raw) => Number(raw.replace(',', '.')))
    .pipe(
      z
        .number({ error: `${label[0]?.toUpperCase()}${label.slice(1)} must be a number, like 182.4.` })
        .gt(0, `${label[0]?.toUpperCase()}${label.slice(1)} must be more than 0 ${unit}.`)
        .max(max, `${max} ${unit} is more than any crab here. Check the reading.`),
    );

export const measurementSchema = z.object({
  weight_g: decimalField('weight', 'g', 2000),
  width_cm: decimalField('width', 'cm', 30),
});
export type MeasurementInput = z.input<typeof measurementSchema>;
export type MeasurementOutput = z.output<typeof measurementSchema>;

export const forecastSchema = z.object({
  code: z.string(),
  predicted_weight_g: z.number().positive(),
  predicted_width_cm: z.number().positive(),
});
export type Forecast = z.infer<typeof forecastSchema>;

export const loggedCrabSchema = z.object({
  id: z.string(),
  code: z.string(),
  weight_g: z.number(),
  width_cm: z.number(),
  logged_at_label: z.string(),
});
export type LoggedCrab = z.infer<typeof loggedCrabSchema>;

export const barcodeResultsSchema = z.array(z.object({ rawValue: z.string() }));
