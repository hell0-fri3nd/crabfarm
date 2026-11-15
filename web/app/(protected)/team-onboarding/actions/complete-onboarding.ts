'use server';

import { getCurrentUser } from '@/lib/auth';
import type { ActionResult } from '@/types/api';

import { onboardingApi } from '../api/onboarding-api';
import { createPasswordStepSchema, pinStepSchema } from '../types/onboarding';

import type { PasswordStepInput, PinStepInput } from '../types/onboarding';

export const completeOnboarding = async (
  password: PasswordStepInput,
  pin: PinStepInput,
): Promise<ActionResult<null>> => {
  const { name } = await getCurrentUser();
  const parsedPassword = createPasswordStepSchema(name).safeParse(password);
  const parsedPin = pinStepSchema.safeParse(pin);

  if (!parsedPassword.success || !parsedPin.success) {
    const issues = [...(parsedPassword.error?.issues ?? []), ...(parsedPin.error?.issues ?? [])];
    return {
      ok: false,
      message: 'Check the highlighted fields.',
      errors: issues.map(({ path, message, code }) => ({ field: path.join('.'), message, type: code })),
    };
  }

  const result = await onboardingApi.complete({
    new_password: parsedPassword.data.new_password,
    new_pin: parsedPin.data.new_pin,
  });
  if (!result.ok) return { ok: false, message: result.message, errors: result.errors };

  return { ok: true, message: result.message, data: null };
};
