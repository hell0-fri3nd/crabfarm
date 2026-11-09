'use client';

import { Controller, useWatch } from 'react-hook-form';
import { Check, Lock, QrCode, RotateCcw, Scale } from 'lucide-react';

import type { UseFormReturn } from 'react-hook-form';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomSeverityAlert from '@/components/custom/custom-severity-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { checkAgainstForecast } from '../lib/forecast-check';
import { measurementSchema } from '../types/scan';

import type { Forecast, MeasurementInput, MeasurementOutput, ScannedSticker } from '../types/scan';

type CustomReviewFormProps = {
  form: UseFormReturn<MeasurementInput, unknown, MeasurementOutput>;
  sticker: ScannedSticker | null;
  forecast: Forecast | null;
  isScaleConnected: boolean;
  isCameraOn: boolean;
  onSave: (values: MeasurementOutput) => void;
  onRescan: () => void;
};

const CustomReviewForm = ({
  form,
  sticker,
  forecast,
  isScaleConnected,
  isCameraOn,
  onSave,
  onRescan,
}: CustomReviewFormProps) => {
  const weight = useWatch({ control: form.control, name: 'weight_g' });
  const parsedWeight = measurementSchema.shape.weight_g.safeParse(weight);
  const forecastGap = forecast && parsedWeight.success ? checkAgainstForecast(parsedWeight.data, forecast) : null;

  const lockedFields = sticker
    ? [
        { id: 'locked-batch', label: 'Batch', value: sticker.batch_code },
        { id: 'locked-group', label: 'Group', value: sticker.group },
        { id: 'locked-crab', label: 'Crab', value: sticker.code },
      ]
    : [];

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading
        title="Review and save"
        description={sticker ? 'Check the numbers, then save.' : 'Scan a sticker to fill this in.'}
        actions={
          sticker && (
            <Button type="button" variant="outline" className="h-11 bg-card/60 px-4" onClick={onRescan}>
              <RotateCcw aria-hidden />
              Rescan
            </Button>
          )
        }
      />
      <CardContent className="px-4 sm:px-6">
        <form noValidate onSubmit={form.handleSubmit(onSave)}>
          <FieldGroup className="gap-6">
            {sticker ? (
              <fieldset className="flex flex-col gap-3" aria-describedby="locked-hint">
                <legend className="sr-only">From the sticker</legend>
                <div className="grid grid-cols-3 gap-3">
                  {lockedFields.map(({ id, label, value }) => (
                    <Field key={id} className="gap-2">
                      <FieldLabel htmlFor={id}>{label}</FieldLabel>
                      <Input
                        id={id}
                        value={value}
                        readOnly
                        aria-readonly
                        className="h-11 bg-muted/60 font-mono font-semibold text-foreground"
                      />
                    </Field>
                  ))}
                </div>
                <p id="locked-hint" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden />
                  Locked to the scanned sticker. Rescan if it&apos;s the wrong crab.
                </p>
              </fieldset>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/40 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-card text-muted-foreground">
                  <QrCode className="size-4.5" aria-hidden />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold">No sticker read yet</p>
                  <p className="text-sm text-muted-foreground">Batch, group and crab number come from the sticker.</p>
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 sm:gap-4">
              <Controller
                name="weight_g"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="weight_g">Weight (g)</FieldLabel>
                    <Input
                      {...field}
                      id="weight_g"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? 'weight_g-error' : 'weight_g-hint'}
                      className="h-11 bg-card tabular-nums"
                    />
                    <FieldError id="weight_g-error" errors={[fieldState.error]} />
                    <FieldDescription id="weight_g-hint" className="flex items-center gap-1.5">
                      <Scale className="size-3.5" aria-hidden />
                      {isScaleConnected ? 'From the scale' : 'Scale not connected. Type it from the display.'}
                    </FieldDescription>
                  </Field>
                )}
              />
              <Controller
                name="width_cm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="width_cm">Width (cm)</FieldLabel>
                    <Input
                      {...field}
                      id="width_cm"
                      inputMode="decimal"
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? 'width_cm-error' : 'width_cm-hint'}
                      className="h-11 bg-card tabular-nums"
                    />
                    <FieldError id="width_cm-error" errors={[fieldState.error]} />
                    <FieldDescription id="width_cm-hint">
                      {isCameraOn
                        ? 'Measured by camera. Check with calipers if it looks off.'
                        : 'Measure across the shell with calipers.'}
                    </FieldDescription>
                  </Field>
                )}
              />
            </div>

            {forecastGap && (
              <CustomSeverityAlert
                level={forecastGap.level}
                title={forecastGap.title}
                description={forecastGap.description}
              />
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!sticker || form.formState.isSubmitting}
                aria-describedby={sticker ? undefined : 'save-disabled-reason'}
              >
                <Check aria-hidden />
                {form.formState.isSubmitting ? 'Saving…' : 'Save log'}
              </Button>
              {!sticker && (
                <p id="save-disabled-reason" className="text-center text-xs text-muted-foreground">
                  Scan a sticker first, so the log goes to the right crab.
                </p>
              )}
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomReviewForm;
