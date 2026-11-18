import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { forecastModelApi } from '@/api/forecast-model-api';
import { waterSensorLogsApi } from '@/api/water-sensor-logs-api';
import { waterSensorThresholdsApi } from '@/api/water-sensor-thresholds-api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { getCurrentUser } from '@/lib/auth';
import { toFirstName } from '@/lib/format';
import { can } from '@/lib/permissions';
import { PREVIEW_USER } from '@/lib/preview';
import { toWaterSensorInfos } from '@/lib/water-sensors';

import { dashboardApi } from './api/dashboard-api';
import CustomAlertList from './components/custom-alert-list';
import CustomBriefing from './components/custom-briefing';
import CustomGrowthCard from './components/custom-growth-card';
import CustomGrowthModelAlert from './components/custom-growth-model-alert';
import CustomSummaryStats from './components/custom-summary-stats';
import CustomWaterMonitor from './components/custom-water-monitor';
import CustomWaterUpdates from './components/custom-water-updates';
import { DEFAULT_GROWTH_RANGE } from './lib/growth-points';
import { loadGrowth } from './lib/load-growth';
import { PREVIEW_BRIEFING } from './lib/preview-dashboard';
import { growthRangeSchema } from './types/dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const GrowthLoader = async ({ searchParams }: DashboardPageProps) => {
  await connection();
  const range = growthRangeSchema.catch(DEFAULT_GROWTH_RANGE).parse((await searchParams).growth);
  const [result, model, self] = await Promise.all([loadGrowth(new Date(), range), forecastModelApi.get(), getCurrentUser()]);

  return (
    <section aria-label="Crab growth" className="flex flex-col gap-4">
      <CustomGrowthModelAlert
        initialStatus={model.ok ? model.data : null}
        canRetrain={can(self.role, 'forecasts.retrain')}
        selfId={self.id}
      />
      {result.ok ? (
        <CustomGrowthCard data={result.data} />
      ) : (
        <Card className="py-0">
          <CustomEmptyState icon={CircleX} title="Couldn't load crab growth" hint={`${result.message} The rest of the dashboard still works.`} />
        </Card>
      )}
    </section>
  );
};

// Ten 30-minute logs of six sensors each
const WATER_UPDATE_ROWS = 60;

const WaterLoadError = ({ title, message }: { title: string; message: string }) => (
  <Card className="py-0">
    <CustomEmptyState icon={CircleX} title={title} hint={`${message} The rest of the dashboard still works.`} />
  </Card>
);

const WaterLoader = async () => {
  await connection();
  const [thresholds, logs] = await Promise.all([
    waterSensorThresholdsApi.list(),
    waterSensorLogsApi.list(new URLSearchParams({ page: '1', size: String(WATER_UPDATE_ROWS), sort: '-measured_at' })),
  ]);

  if (!thresholds.ok) return <WaterLoadError title="Couldn't load the water sensors" message={thresholds.message} />;

  const sensors = toWaterSensorInfos(thresholds.data);

  return (
    <>
      <CustomWaterMonitor sensors={sensors} />
      {logs.ok ? (
        <CustomWaterUpdates logs={logs.data.items} now={new Date()} sensors={sensors} />
      ) : (
        <WaterLoadError title="Couldn't load the sensor logs" message={logs.message} />
      )}
    </>
  );
};

const SummaryLoader = async () => {
  const summary = await dashboardApi.summary();
  if (!summary.ok) return <WaterLoadError title="Couldn't load the summary" message={summary.message} />;

  return <CustomSummaryStats initialSummary={summary.data} />;
};

const SUMMARY_SKELETON_KEYS = ['water', 'crabs', 'next-feed'];

const SummarySkeleton = () => (
  <Card className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-3" aria-busy="true">
    <p className="sr-only" role="status">
      Loading the summary…
    </p>
    {SUMMARY_SKELETON_KEYS.map((key) => (
      <div key={key} className="flex flex-col gap-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </Card>
);

const WaterSkeleton = () => (
  <Card className="gap-5 rounded-2xl px-4 py-5 sm:px-6 sm:py-6" aria-busy="true">
    <p className="sr-only" role="status">
      Loading the water sensors…
    </p>
    <Skeleton className="h-6 w-56" />
    <Skeleton className="h-72 w-full rounded-xl" />
  </Card>
);

const GrowthSkeleton = () => (
  <Card className="gap-5 rounded-2xl px-4 py-5 sm:px-6 sm:py-6" aria-busy="true">
    <p className="sr-only" role="status">
      Loading crab growth…
    </p>
    <Skeleton className="h-6 w-56" />
    <Skeleton className="h-4 w-80 max-w-full" />
    <Skeleton className="h-72 w-full rounded-xl md:h-80" />
  </Card>
);

const DashboardPage = ({ searchParams }: DashboardPageProps) => (
  <div className="flex w-full flex-col gap-8">
    <CustomBriefing firstName={toFirstName(PREVIEW_USER.name)} summary={PREVIEW_BRIEFING} />
    <Suspense fallback={<SummarySkeleton />}>
      <SummaryLoader />
    </Suspense>
    <CustomAlertList />
    <Suspense fallback={<WaterSkeleton />}>
      <WaterLoader />
    </Suspense>
    <Suspense fallback={<GrowthSkeleton />}>
      <GrowthLoader searchParams={searchParams} />
    </Suspense>
  </div>
);

export default DashboardPage;
