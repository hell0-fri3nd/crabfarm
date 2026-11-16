'use client';

import { Controller } from 'react-hook-form';
import { Check, Lock, QrCode, RotateCcw, Scale } from 'lucide-react';

import type { UseFormReturn } from 'react-hook-form';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import type { MeasurementInput, MeasurementOutput, ScannedSticker } from '../types/scan';

type CustomReviewFormProps = {
  form: UseFormReturn<MeasurementInput, unknown, MeasurementOutput>;
  sticker: ScannedSticker | null;
  isScaleConnected: boolean;
  onSave: (values: MeasurementOutput) => Promise<void>;
  onRescan: () => void;
};

const CustomReviewForm = ({ form, sticker, isScaleConnected, onSave, onRescan }: CustomReviewFormProps) => {
  const isSaving = form.formState.isSubmitting;
  const lockedFields = sticker
    ? [
        { id: 'locked-batch', label: 'Batch', value: sticker.batch_label },
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
        <form noValidate onSubmit={(event) => void form.handleSubmit(onSave)(event)}>
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
                      readOnly={isSaving}
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
                name="width_mm"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="width_mm">Width (mm)</FieldLabel>
                    <Input
                      {...field}
                      id="width_mm"
                      inputMode="decimal"
                      readOnly={isSaving}
                      autoComplete="off"
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldState.invalid ? 'width_mm-error' : 'width_mm-hint'}
                      className="h-11 bg-card tabular-nums"
                    />
                    <FieldError id="width_mm-error" errors={[fieldState.error]} />
                    <FieldDescription id="width_mm-hint">Measure across the shell with calipers, in millimetres.</FieldDescription>
                  </Field>
                )}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={!sticker || isSaving}
                aria-describedby={sticker ? undefined : 'save-disabled-reason'}
              >
                <Check aria-hidden />
                {isSaving ? 'Saving…' : 'Save log'}
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
