'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import CustomPinField from '@/components/custom/custom-pin-field';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PIN_LENGTH } from '@/types/pin';

import CustomStepActions from './custom-step-actions';
import { pinStepSchema } from '../types/onboarding';

import type { PinStepInput } from '../types/onboarding';

type CustomPinStepProps = {
  defaultValues?: PinStepInput;
  onBack: () => void;
  onComplete: (values: PinStepInput) => void;
};

const CustomPinStep = ({ defaultValues, onBack, onComplete }: CustomPinStepProps) => {
  const form = useForm<PinStepInput>({
    resolver: zodResolver(pinStepSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: defaultValues ?? { new_pin: '', confirm_pin: '' },
  });

  return (
    <section aria-labelledby="pin-step-title">
      <h1 id="pin-step-title" className="text-3xl font-bold">Set a quick PIN</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Unlock this device with {PIN_LENGTH} digits instead of your password.
      </p>

      <form noValidate onSubmit={form.handleSubmit(onComplete)} className="mt-6">
        <FieldGroup className="gap-6">
          <Controller
            name="new_pin"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new_pin">New PIN</FieldLabel>
                <CustomPinField
                  id="new_pin"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isAutoFocus
                  isInvalid={fieldState.invalid}
                  describedBy="new_pin-hint"
                />
                <FieldDescription id="new_pin-hint">Avoid 1234 or your birthday.</FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="confirm_pin"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirm_pin">Enter it again</FieldLabel>
                <CustomPinField
                  id="confirm_pin"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  isInvalid={fieldState.invalid}
                  describedBy={fieldState.invalid ? 'confirm_pin-error' : undefined}
                />
                <FieldError id="confirm_pin-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <CustomStepActions
            submitLabel="Continue"
            pendingLabel="Saving…"
            isPending={form.formState.isSubmitting}
            onBack={onBack}
          />
        </FieldGroup>
      </form>
    </section>
  );
};

export default CustomPinStep;
