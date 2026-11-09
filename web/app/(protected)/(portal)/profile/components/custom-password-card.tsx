'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import CustomPasswordInput from '@/components/custom/custom-password-input';
import CustomPasswordRules from '@/components/custom/custom-password-rules';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { notify } from '@/lib/notify';

import { simulateSave } from '../lib/preview-profile';
import { createPasswordFormSchema } from '../types/profile';

import type { PasswordFormInput } from '../types/profile';

type CustomPasswordCardProps = {
  name: string;
  changedLabel: string;
};

const EMPTY_VALUES: PasswordFormInput = { current_password: '', new_password: '', confirm_password: '' };

const FIELDS = [
  { name: 'current_password', label: 'Current password', autoComplete: 'current-password' },
  { name: 'new_password', label: 'New password', autoComplete: 'new-password' },
  { name: 'confirm_password', label: 'Type it again', autoComplete: 'new-password' },
] as const;

const CustomPasswordCard = ({ name, changedLabel }: CustomPasswordCardProps) => {
  const form = useForm<PasswordFormInput>({
    resolver: zodResolver(createPasswordFormSchema(name)),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: EMPTY_VALUES,
  });
  const newPassword = useWatch({ control: form.control, name: 'new_password' });

  const handleSave = async () => {
    await simulateSave();
    form.reset(EMPTY_VALUES);
    notify.success('Password updated', { description: 'Use it next time you sign in. Your PIN stays the same.' });
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading title="Password" description={changedLabel} />
      <CardContent className="px-4 sm:px-6">
        <form noValidate onSubmit={form.handleSubmit(handleSave)}>
          <FieldGroup className="gap-6">
            {FIELDS.map(({ name: fieldName, label, autoComplete }) => (
              <Controller
                key={fieldName}
                name={fieldName}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={fieldName}>{label}</FieldLabel>
                    <CustomPasswordInput
                      {...field}
                      id={fieldName}
                      autoComplete={autoComplete}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldName === 'new_password' ? 'profile-password-rules' : `${fieldName}-error`}
                    />
                    <FieldError id={`${fieldName}-error`} errors={[fieldState.error]} />
                    {fieldName === 'new_password' && (
                      <CustomPasswordRules id="profile-password-rules" password={newPassword} name={name} />
                    )}
                  </Field>
                )}
              />
            ))}
            <Button type="submit" className="h-11 w-full px-5 sm:w-fit" disabled={form.formState.isSubmitting}>
              <KeyRound aria-hidden />
              {form.formState.isSubmitting ? 'Saving…' : 'Update password'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
};

export default CustomPasswordCard;
