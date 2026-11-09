import type { Metadata } from 'next';

import CustomFeedBarChart from './components/custom-feed-bar-chart';
import CustomFeedingBoard from './components/custom-feeding-board';
import CustomScheduleList from './components/custom-schedule-list';
import {
  PREVIEW_CAGES,
  PREVIEW_FEED_DAYS,
  PREVIEW_GROUPS,
  PREVIEW_NEXT_FEED,
  PREVIEW_PLAN_KG,
  PREVIEW_SCHEDULES,
} from './lib/preview-feeding';

export const metadata: Metadata = { title: 'Feeding' };

const FeedingPage = () => (
  <div className="flex flex-col gap-8">
    <CustomFeedingBoard groups={PREVIEW_GROUPS} initialCages={PREVIEW_CAGES} nextFeed={PREVIEW_NEXT_FEED} />
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <CustomFeedBarChart days={PREVIEW_FEED_DAYS} planKg={PREVIEW_PLAN_KG} cageCount={PREVIEW_CAGES.length} />
      <CustomScheduleList initialSchedules={PREVIEW_SCHEDULES} groups={PREVIEW_GROUPS} />
    </div>
  </div>
);

export default FeedingPage;
