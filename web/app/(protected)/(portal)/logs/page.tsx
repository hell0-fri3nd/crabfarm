import { Suspense } from 'react';

import type { Metadata } from 'next';

import CustomLogsSkeleton from './components/custom-logs-skeleton';
import CustomLogsView from './components/custom-logs-view';

export const metadata: Metadata = { title: 'Logs' };

const LogsPage = () => (
  <Suspense fallback={<CustomLogsSkeleton />}>
    <CustomLogsView />
  </Suspense>
);

export default LogsPage;
