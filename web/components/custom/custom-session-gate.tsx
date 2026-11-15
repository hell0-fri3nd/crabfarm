import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { DASHBOARD_HREF } from '@/lib/navigation';
import { ONBOARDING_HREF } from '@/lib/routes';

type CustomSessionGateProps = {
  stage: 'portal' | 'onboarding';
};

const SessionCheck = async ({ stage }: CustomSessionGateProps) => {
  const { needs_onboarding } = await getCurrentUser();

  if (stage === 'portal' && needs_onboarding) redirect(ONBOARDING_HREF);
  if (stage === 'onboarding' && !needs_onboarding) redirect(DASHBOARD_HREF);

  return null;
};

// A sibling of the shell, not its wrapper, so the shell prerenders and navigation stays instant; proxy.ts and FastAPI do the real auth checks
const CustomSessionGate = ({ stage }: CustomSessionGateProps) => (
  <Suspense fallback={null}>
    <SessionCheck stage={stage} />
  </Suspense>
);

export default CustomSessionGate;
