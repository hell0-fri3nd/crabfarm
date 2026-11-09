import { Suspense } from 'react';

import type { Metadata } from 'next';

import CustomActivitySkeleton from './components/custom-activity-skeleton';
import CustomActivityView from './components/custom-activity-view';

export const metadata: Metadata = { title: 'Activity' };

const ActivityPage = () => (
  <Suspense fallback={<CustomActivitySkeleton />}>
    <CustomActivityView />
  </Suspense>
);

export default ActivityPage;
