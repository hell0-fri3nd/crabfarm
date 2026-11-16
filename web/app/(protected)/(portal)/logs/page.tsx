import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { batchesApi } from '@/api/batches-api';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';

import CustomLogsSkeleton from './components/custom-logs-skeleton';
import CustomLogsView from './components/custom-logs-view';
import { loadCrabLogPage, loadLogContext } from './lib/load-crab-logs';
import { logsSearchParamsSchema } from './types/logs';

export const metadata: Metadata = { title: 'Logs' };

type LogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const LogsLoader = async ({ searchParams }: LogsPageProps) => {
  await connection();
  const params = logsSearchParamsSchema.parse(await searchParams);
  const now = new Date();
  const [loaded, batches] = await Promise.all([loadLogContext(), batchesApi.list()]);

  const crab = loaded.ok ? await loadCrabLogPage(params, loaded.context, now) : loaded;

  if (!crab.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState icon={CircleX} title="Couldn't load the crab logs" hint={crab.message || 'Try again in a moment.'} />
      </Card>
    );
  }

  const batchOptions = (batches.ok ? batches.data : [])
    .toSorted((left, right) => right.id - left.id)
    .map(({ id }) => ({ value: String(id), label: `Batch ${id}` }));

  return <CustomLogsView crabPage={crab.page} batches={batchOptions} nowIso={now.toISOString()} />;
};

const LogsPage = ({ searchParams }: LogsPageProps) => (
  <Suspense fallback={<CustomLogsSkeleton />}>
    <LogsLoader searchParams={searchParams} />
  </Suspense>
);

export default LogsPage;
