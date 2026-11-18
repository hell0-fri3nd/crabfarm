import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { forecastModelApi } from '@/api/forecast-model-api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { getCurrentUser } from '@/lib/auth';
import { toFirstName } from '@/lib/format';
import { can } from '@/lib/permissions';
import { PREVIEW_USER } from '@/lib/preview';

import CustomAlertList from './components/custom-alert-list';
import CustomBriefing from './components/custom-briefing';
import CustomGrowthCard from './components/custom-growth-card';
import CustomGrowthModelAlert from './components/custom-growth-model-alert';
import CustomSensorTrends from './components/custom-sensor-trends';
import CustomSummaryStats from './components/custom-summary-stats';
import CustomWaterNow from './components/custom-water-now';
import { loadGrowth } from './lib/load-growth';
import {
  PREVIEW_ALERTS,
  PREVIEW_BRIEFING,
  PREVIEW_READINGS,
  PREVIEW_SUMMARY,
} from './lib/preview-dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

const GrowthLoader = async () => {
  await connection();
  const [result, model, self] = await Promise.all([loadGrowth(new Date()), forecastModelApi.get(), getCurrentUser()]);

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

const DashboardPage = () => (
  <div className="flex w-full flex-col gap-8">
    <CustomBriefing firstName={toFirstName(PREVIEW_USER.name)} summary={PREVIEW_BRIEFING} />
    <CustomSummaryStats stats={PREVIEW_SUMMARY} />
    <CustomAlertList alerts={PREVIEW_ALERTS} />
    <CustomWaterNow readings={PREVIEW_READINGS} />
    <CustomSensorTrends />
    <Suspense fallback={<GrowthSkeleton />}>
      <GrowthLoader />
    </Suspense>
  </div>
);

export default DashboardPage;
