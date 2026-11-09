import type { Metadata } from 'next';

import CustomFooter from '@/components/custom/custom-footer';

import CustomSignInForm from '../components/custom-sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

const SignInPage = () => (
  <>
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <CustomSignInForm />
    </main>
    <CustomFooter />
  </>
);

export default SignInPage;
