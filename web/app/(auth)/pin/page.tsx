import { Suspense } from 'react';
import type { Metadata } from 'next';

import CustomFooter from '@/components/custom/custom-footer';

import CustomPinPanel from '../components/custom-pin-panel';
import CustomPinSkeleton from '../components/custom-pin-skeleton';

export const metadata: Metadata = { title: 'Unlock with PIN' };

const PinPage = () => (
  <>
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<CustomPinSkeleton />}>
        <CustomPinPanel />
      </Suspense>
    </main>
    <CustomFooter />
  </>
);

export default PinPage;
