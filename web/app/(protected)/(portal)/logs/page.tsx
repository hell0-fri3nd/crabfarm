import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { batchesApi } from '@/api/batches-api';
import { forecastModelApi } from '@/api/forecast-model-api';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import CustomLogsSkeleton from './components/custom-logs-skeleton';
import CustomLogsView from './components/custom-logs-view';
import { EMPTY_CRAB_LOG_PAGE } from './lib/crab-log-query';
import { loadCrabLogChart, loadCrabLogPage, loadLogContext } from './lib/load-crab-logs';
import { loadSensorLogPage } from './lib/load-sensor-logs';
import { EMPTY_SENSOR_COUNTS, EMPTY_SENSOR_LOG_PAGE } from './lib/sensor-log-query';
import { logsSearchParamsSchema } from './types/logs';

import type { LogsSearchParams } from './types/logs';

export const metadata: Metadata = { title: 'Logs' };

type LogsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const loadCrabTab = async (params: LogsSearchParams, now: Date) => {
  const loaded = await loadLogContext();
  if (!loaded.ok) return [loaded, null] as const;

  const isChart = params.view === 'chart';
  return Promise.all([
    isChart ? null : loadCrabLogPage(params, loaded.context, now),
    isChart ? loadCrabLogChart(params, loaded.context, now) : null,
  ]);
};

const LogsLoader = async ({ searchParams }: LogsPageProps) => {
  await connection();
  const params = logsSearchParamsSchema.parse(await searchParams);
  const now = new Date();
  const isCrabTab = params.tab === 'crab';
  const [[crab, chart], sensor, batches, self, model] = await Promise.all([
    isCrabTab ? loadCrabTab(params, now) : ([null, null] as const),
    isCrabTab ? null : loadSensorLogPage(params, now),
    batchesApi.list(),
    getCurrentUser(),
    forecastModelApi.get(),
  ]);
  const failure = [crab, chart, sensor].find((result) => result && !result.ok);

  if (failure && !failure.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState
          icon={CircleX}
          title={isCrabTab ? "Couldn't load the crab logs" : "Couldn't load the sensor logs"}
          hint={failure.message || 'Try again in a moment.'}
        />
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
      sensorPage={sensor?.ok ? sensor.page : EMPTY_SENSOR_LOG_PAGE}
      sensorCounts={sensor?.ok ? sensor.counts : EMPTY_SENSOR_COUNTS}
      batches={batchOptions}
      nowIso={now.toISOString()}
      canRunPrediction={can(self.role, 'forecasts.run')}
      canRetrain={can(self.role, 'forecasts.retrain')}
      modelStatus={model.ok ? model.data : null}
      selfId={self.id}
    />
  );
};

const LogsPage = ({ searchParams }: LogsPageProps) => (
  <Suspense fallback={<CustomLogsSkeleton />}>
    <LogsLoader searchParams={searchParams} />
  </Suspense>
);

export default LogsPage;
