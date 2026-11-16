import { Suspense } from 'react';
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
import CustomQrStickersWorkspace from './components/custom-qr-stickers-workspace';
import { toDownloadRecord } from './lib/download-history';
import QrStickersLoading from './loading';

export const metadata: Metadata = { title: 'QR stickers' };

const QrStickersLoader = async () => {
  const [batches, crabs, downloadsResult, self] = await Promise.all([
    batchesApi.list(),
    crabsApi.list(),
    auditEventsApi.listStickerDownloads(),
    getCurrentUser(),
  ]);

  if (!batches.ok || !crabs.ok) {
    const failure = firstFailure(batches, crabs);
    return (
      <Card className="py-0">
        <CustomEmptyState
          icon={CircleX}
          title="Couldn't load batches and crabs"
          hint={failure ?? 'Try again in a moment.'}
        />
      </Card>
    );
  }

  const initialHistory = {
    records: downloadsResult.ok ? downloadsResult.data.items.map((event) => toDownloadRecord(event, self.id)) : [],
    total: downloadsResult.ok ? downloadsResult.data.total : 0,
    isEveryone: can(self.role, 'activity.view_everyone'),
    error: downloadsResult.ok ? null : downloadsResult.message,
  };

  return <CustomQrStickersWorkspace
      initialBatches={batches.data}
      crabs={crabs.data}
      initialHistory={initialHistory}
      canCreateBatch={can(self.role, 'batches.create')}
    />;
};

const QrStickersPage = () => (
  <div className="w-full">
    <Suspense fallback={<QrStickersLoading />}>
      <QrStickersLoader />
    </Suspense>
  </div>
);

export default QrStickersPage;
