'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomPinField from '@/components/custom/custom-pin-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { notify } from '@/lib/notify';
import { PIN_LENGTH } from '@/types/pin';

import { simulateSave } from '../lib/preview-profile';
import { pinFormSchema } from '../types/profile';

import type { PinFormInput } from '../types/profile';

const EMPTY_VALUES: PinFormInput = { current_pin: '', new_pin: '', confirm_pin: '' };

const FIELDS = [
  { name: 'current_pin', label: 'Current PIN', hint: null },
  { name: 'new_pin', label: 'New PIN', hint: `${PIN_LENGTH} digits. Not 1234 and not one repeated digit.` },
  { name: 'confirm_pin', label: 'Type it again', hint: null },
] as const;

const CustomPinCard = () => {
  const form = useForm<PinFormInput>({
    resolver: zodResolver(pinFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });

  const handleSave = async () => {
    await simulateSave();
    form.reset(EMPTY_VALUES);
    notify.success('PIN updated', { description: 'Use it to unlock on devices where you stay signed in.' });
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading title="PIN" description="Unlocks CrabFarm on devices where you stay signed in" />
      <CardContent className="px-4 sm:px-6">
        <form noValidate onSubmit={form.handleSubmit(handleSave)}>
          <FieldGroup className="gap-6">
            {FIELDS.map(({ name, label, hint }) => (
              <Controller
                key={name}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={name}>{label}</FieldLabel>
                    <CustomPinField
                      id={name}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      isInvalid={fieldState.invalid}
                      describedBy={[hint && `${name}-hint`, fieldState.invalid && `${name}-error`].filter(Boolean).join(' ') || undefined}
                    />
                    {hint && <FieldDescription id={`${name}-hint`}>{hint}</FieldDescription>}
                    <FieldError id={`${name}-error`} errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ))}
            <Button type="submit" className="h-11 w-full px-5 sm:w-fit" disabled={form.formState.isSubmitting}>
              <KeyRound aria-hidden />
              {form.formState.isSubmitting ? 'Saving…' : 'Update PIN'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomPinCard;
