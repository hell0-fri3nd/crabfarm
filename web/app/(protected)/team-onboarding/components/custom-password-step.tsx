'use client';

import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import CustomPasswordInput from '@/components/custom/custom-password-input';
import CustomPasswordRules from '@/components/custom/custom-password-rules';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';

import CustomStepActions from './custom-step-actions';
import { createPasswordStepSchema } from '../types/onboarding';

import type { PasswordStepInput } from '../types/onboarding';

type CustomPasswordStepProps = {
  name: string;
  email: string;
  defaultValues?: PasswordStepInput;
  onComplete: (values: PasswordStepInput) => void;
};

const CustomPasswordStep = ({ name, email, defaultValues, onComplete }: CustomPasswordStepProps) => {
  const form = useForm<PasswordStepInput>({
    resolver: zodResolver(createPasswordStepSchema(name)),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: defaultValues ?? { new_password: '', confirm_password: '' },
  });

  const newPassword = useWatch({ control: form.control, name: 'new_password' });

  return (
    <section aria-labelledby="password-step-title">
      <h1 id="password-step-title" className="text-3xl font-bold">Choose a password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        for <span className="text-foreground">{email}</span>
      </p>

      <form noValidate onSubmit={form.handleSubmit(onComplete)} className="mt-6">
        <FieldGroup className="gap-6">
          <Controller
            name="new_password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="new_password">New password</FieldLabel>
                <CustomPasswordInput
                  {...field}
                  id="new_password"
                  autoComplete="new-password"
                  autoFocus
                  aria-invalid={fieldState.invalid}
                  aria-describedby="password-rules"
                />
                <FieldError errors={[fieldState.error]} />
                <CustomPasswordRules id="password-rules" password={newPassword} name={name} />
              </Field>
            )}
          />

          <Controller
            name="confirm_password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirm_password">Type it again</FieldLabel>
                <CustomPasswordInput
                  {...field}
                  id="confirm_password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'confirm_password-error' : undefined}
                />
                <FieldError id="confirm_password-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <CustomStepActions submitLabel="Continue" pendingLabel="Saving…" isPending={form.formState.isSubmitting} />
        </FieldGroup>
      </form>
    </section>
  );
};

export default CustomPasswordStep;
