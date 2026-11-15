import type { Metadata } from 'next';

import CustomFooter from '@/components/custom/custom-footer';
import { getCurrentUser } from '@/lib/auth';

import CustomOnboardingWizard from './components/custom-onboarding-wizard';

export const metadata: Metadata = { title: 'Set up your account' };

const TeamOnboardingPage = async () => {
  const { name, email } = await getCurrentUser();

  return (
    <>
      <main className="flex flex-1 justify-center px-4 py-12 md:pt-24">
        <CustomOnboardingWizard name={name} email={email} />
      </main>
      <CustomFooter>You&apos;ll come back here on your next sign-in until every step is done.</CustomFooter>
    </>
  );
};

export default TeamOnboardingPage;
