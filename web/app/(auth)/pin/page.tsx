import type { Metadata } from 'next';

import CustomFooter from '@/components/custom/custom-footer';

import CustomPinForm from '../components/custom-pin-form';

export const metadata: Metadata = { title: 'Unlock with PIN' };

// Placeholder until the BFF reads the signed-in user's name from the session
const PREVIEW_USER_NAME = 'Art Lisboa';

const PinPage = () => (
  <>
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <CustomPinForm name={PREVIEW_USER_NAME} />
    </main>
    <CustomFooter />
  </>
);

export default PinPage;
