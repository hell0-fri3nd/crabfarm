import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { batchesApi } from '@/api/batches-api';
import { crabsApi } from '@/api/crabs-api';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';
import { firstFailure } from '@/lib/api-result';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import { auditEventsApi } from './api/audit-events-api';
import { logsApi } from './api/logs-api';
import CustomScanWorkspace from './components/custom-scan-workspace';
import { fromLogCreatedEvent } from './lib/recent-logs';
import ScanLoading from './loading';

export const metadata: Metadata = { title: 'Scan crab' };

const ScanLoader = async () => {
  await connection();
  const [batches, crabs, recentResult, todayResult, self] = await Promise.all([
    batchesApi.list(),
    crabsApi.list(),
    auditEventsApi.listRecentLogs(),
    logsApi.countToday(new Date()),
    getCurrentUser(),
  ]);

  if (!batches.ok || !crabs.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState
          icon={CircleX}
          title="Couldn't load batches and crabs"
          hint={firstFailure(batches, crabs) ?? 'Try again in a moment.'}
        />
      </Card>
    );
  }

  const initialRecent = {
    records: recentResult.ok ? recentResult.data.items.map((event) => fromLogCreatedEvent(event, crabs.data, self.id)) : [],
    isEveryone: can(self.role, 'activity.view_everyone'),
    error: recentResult.ok ? null : recentResult.message,
  };

  return (
    <CustomScanWorkspace
      batches={batches.data}
      crabs={crabs.data}
      initialRecent={initialRecent}
      loggedToday={todayResult.ok ? todayResult.data.total : null}
    />
  );
};

const ScanPage = () => (
  <div className="w-full">
    <Suspense fallback={<ScanLoading />}>
      <ScanLoader />
    </Suspense>
  </div>
);

export default ScanPage;
