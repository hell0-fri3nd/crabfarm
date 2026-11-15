import 'server-only';

import { z } from 'zod';

import { bff } from '@/lib/bff/api-client';

import type { OnboardingInput } from '../types/onboarding';

export const onboardingApi = {
  complete: (input: OnboardingInput) => bff.post('/auth/onboarding', input, z.null()),
};
