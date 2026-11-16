import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { batchesApi } from '@/api/batches-api';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';

import CustomLogsSkeleton from './components/custom-logs-skeleton';
import CustomLogsView from './components/custom-logs-view';
import { EMPTY_CRAB_LOG_PAGE } from './lib/crab-log-query';
import { loadCrabLogChart, loadCrabLogPage, loadLogContext } from './lib/load-crab-logs';
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

  const isChart = params.tab === 'crab' && params.view === 'chart';
  const [crab, chart] = loaded.ok
    ? await Promise.all([
        isChart ? null : loadCrabLogPage(params, loaded.context, now),
        isChart ? loadCrabLogChart(params, loaded.context, now) : null,
      ])
    : [loaded, null];
  const failure = [crab, chart].find((result) => result && !result.ok);

  if (failure && !failure.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState icon={CircleX} title="Couldn't load the crab logs" hint={failure.message || 'Try again in a moment.'} />
      </Card>
    );
  }

  const batchOptions = (batches.ok ? batches.data : [])
    .toSorted((left, right) => right.id - left.id)
    .map(({ id }) => ({ value: String(id), label: `Batch ${id}` }));

  return (
    <CustomLogsView
      crabPage={crab?.ok ? crab.page : EMPTY_CRAB_LOG_PAGE}
      crabChart={chart?.ok ? chart.chart : null}
      batches={batchOptions}
      nowIso={now.toISOString()}
    />
  );
};

const LogsPage = ({ searchParams }: LogsPageProps) => (
  <Suspense fallback={<CustomLogsSkeleton />}>
    <LogsLoader searchParams={searchParams} />
  </Suspense>
);

export default LogsPage;
