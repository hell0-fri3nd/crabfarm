import type { Metadata } from 'next';
import { Suspense } from 'react';

import CustomFooter from '@/components/custom/custom-footer';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentUser } from '@/lib/auth';

import CustomOnboardingWizard from './components/custom-onboarding-wizard';

export const metadata: Metadata = { title: 'Set up your account' };

const OnboardingWizard = async () => {
  const { name, email } = await getCurrentUser();

  return <CustomOnboardingWizard name={name} email={email} />;
};

const OnboardingWizardSkeleton = () => (
  <div className="flex w-full max-w-md flex-col gap-6" aria-busy="true">
    <p className="sr-only" role="status">
      Loading your account…
    </p>
    <Skeleton className="h-2 w-full rounded-full" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-72" />
    </div>
    <Skeleton className="h-80 w-full rounded-2xl" />
  </div>
);

const TeamOnboardingPage = () => (
  <>
    <main className="flex flex-1 justify-center px-4 py-12 md:pt-24">
      <Suspense fallback={<OnboardingWizardSkeleton />}>
        <OnboardingWizard />
      </Suspense>
    </main>
    <CustomFooter>You&apos;ll come back here on your next sign-in until every step is done.</CustomFooter>
  </>
);

export default TeamOnboardingPage;
