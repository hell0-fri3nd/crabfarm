'use client';

import { useRouter } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { toInitials } from '@/lib/format';
import { DASHBOARD_HREF } from '@/lib/navigation';
import { ONBOARDING_HREF } from '@/lib/routes';
import { notify } from '@/lib/notify';
import { PIN_LENGTH } from '@/types/pin';

import { unlockWithPin } from '../actions/unlock-with-pin';
import { pinSchema } from '../types/auth';

import type { PinInput } from '../types/auth';

type CustomPinFormProps = {
  name: string;
  returnTo?: string;
};

const PIN_SLOTS = Array.from({ length: PIN_LENGTH }, (_, index) => index);

const CustomPinForm = ({ name, returnTo = DASHBOARD_HREF }: CustomPinFormProps) => {
  const router = useRouter();
  const form = useForm<PinInput>({
    resolver: zodResolver(pinSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { pin: '' },
  });

  const handleUnlock = async (input: PinInput) => {
    const result = await unlockWithPin(input);

    if (result.ok) {
      form.resetField('pin');
      router.replace(result.data.needs_onboarding ? ONBOARDING_HREF : returnTo);
      return;
    }

    
    const pinError = result.errors.find(({ field }) => field === 'pin');
    if (pinError) {
      form.resetField('pin');
      form.setError('pin', { message: pinError.message }, { shouldFocus: true });
      return;
    }

    notify.error("Couldn't unlock", { description: result.message });
  };

  const submitPin = form.handleSubmit(handleUnlock);

  return (
    <div className="flex w-full max-w-100 flex-col items-center text-center">
      <Avatar className="size-18">
        <AvatarFallback className="bg-primary/15 text-2xl font-bold text-primary">{toInitials(name)}</AvatarFallback>
      </Avatar>
      <h1 className="mt-4 text-3xl font-bold">{name}</h1>

      <form noValidate onSubmit={submitPin} className="mt-2 w-full">
        <Controller
          name="pin"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="items-center">
              <FieldLabel htmlFor="pin" className="justify-center font-normal text-muted-foreground">
                Enter your {PIN_LENGTH}-digit PIN
              </FieldLabel>
              <InputOTP
                {...field}
                id="pin"
                autoFocus
                maxLength={PIN_LENGTH}
                pattern={REGEXP_ONLY_DIGITS}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.invalid ? 'pin-error' : undefined}
                containerClassName="mt-4 justify-center"
                onComplete={submitPin}
              >
                <InputOTPGroup className="gap-2">
                  {PIN_SLOTS.map((slot) => (
                    <InputOTPSlot
                      key={slot}
                      index={slot}
                      aria-invalid={fieldState.invalid}
                      className="size-14 rounded-lg border-l bg-card text-xl font-semibold first:rounded-l-lg last:rounded-r-lg"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldError id="pin-error" errors={[fieldState.error]} className="text-center" />
            </Field>
          )}
        />
      </form>
    </div>
  );
};

export default CustomPinForm;
