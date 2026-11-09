import type { Metadata } from 'next';

import { toFirstName } from '@/lib/format';
import { PREVIEW_USER } from '@/lib/preview';

import CustomAlertList from './components/custom-alert-list';
import CustomBriefing from './components/custom-briefing';
import CustomGrowthCard from './components/custom-growth-card';
import CustomSensorTrends from './components/custom-sensor-trends';
import CustomSummaryStats from './components/custom-summary-stats';
import CustomWaterNow from './components/custom-water-now';
import {
  PREVIEW_ALERTS,
  PREVIEW_BRIEFING,
  PREVIEW_READINGS,
  PREVIEW_SUMMARY,
} from './lib/preview-dashboard';

export const metadata: Metadata = { title: 'Dashboard' };

const DashboardPage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <CustomBriefing firstName={toFirstName(PREVIEW_USER.name)} summary={PREVIEW_BRIEFING} />
    <CustomSummaryStats stats={PREVIEW_SUMMARY} />
    <CustomAlertList alerts={PREVIEW_ALERTS} />
    <CustomWaterNow readings={PREVIEW_READINGS} />
    <CustomSensorTrends />
    <CustomGrowthCard />
  </div>
);

export default DashboardPage;
