import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { DASHBOARD_HREF } from '@/lib/navigation';
import { ONBOARDING_HREF } from '@/lib/routes';

import type { ReactNode } from 'react';

type CustomSessionGateProps = {
  stage: 'portal' | 'onboarding';
  children: ReactNode;
};

const CustomSessionGate = async ({ stage, children }: CustomSessionGateProps) => {
  const { needs_onboarding } = await getCurrentUser();

  if (stage === 'portal' && needs_onboarding) redirect(ONBOARDING_HREF);
  if (stage === 'onboarding' && !needs_onboarding) redirect(DASHBOARD_HREF);

  return children;
};

export default CustomSessionGate;
