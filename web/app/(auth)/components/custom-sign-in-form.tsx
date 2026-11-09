'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Mail } from 'lucide-react';

import CustomPasswordInput from '@/components/custom/custom-password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { notify } from '@/lib/notify';

import { signInSchema } from '../types/auth';

import type { SignInInput } from '../types/auth';

const CustomSignInForm = () => {
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { email: '', password: '', remember_me: true },
  });

  const handleSignIn = async () => {
    notify.info('Sign-in is not connected yet', {
      description: 'The form is valid. It will call the BFF once auth is wired up.',
    });
  };

  return (
    <div className="w-full max-w-100">
      <h1 className="text-3xl font-bold">Sign in</h1>

      <form noValidate onSubmit={form.handleSubmit(handleSignIn)} className="mt-6">
        <FieldGroup className="gap-6">
          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@farm.ph"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? 'email-error' : undefined}
                    className="h-11 bg-card pl-10"
                  />
                </div>
                <FieldError id="email-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <CustomPasswordInput
                  {...field}
                  hasLockIcon
                  id="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'password-error' : undefined}
                />
                <FieldError id="password-error" errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            name="remember_me"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal" className="min-h-6">
                <Checkbox
                  id="remember_me"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="size-5"
                />
                <FieldLabel htmlFor="remember_me" className="font-medium">
                  Keep me signed in on this device
                </FieldLabel>
              </Field>
            )}
          />

          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            <LogIn aria-hidden />
            {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Forgot your password? Ask an admin to reset it, then sign in with the temporary one.
      </p>
    </div>
  );
};

export default CustomSignInForm;
