import type { Metadata } from 'next';

import CustomFooter from '@/components/custom/custom-footer';

import CustomOnboardingWizard from './components/custom-onboarding-wizard';

export const metadata: Metadata = { title: 'Set up your account' };

// Placeholder until the BFF reads the signed-in user from GET /auth/me
const PREVIEW_USER = { name: 'Maria Santos', email: 'maria.santos@farm.ph' };

const TeamOnboardingPage = () => (
  <>
    <main className="flex flex-1 justify-center px-4 py-12 md:pt-24">
      <CustomOnboardingWizard name={PREVIEW_USER.name} email={PREVIEW_USER.email} />
    </main>
    <CustomFooter>You&apos;ll come back here on your next sign-in until every step is done.</CustomFooter>
  </>
);

export default TeamOnboardingPage;
