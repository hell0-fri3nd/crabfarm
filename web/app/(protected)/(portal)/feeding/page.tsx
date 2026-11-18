import type { Metadata } from 'next';

import CustomFeedingBoard from './components/custom-feeding-board';
import CustomScheduleList from './components/custom-schedule-list';
import {
  PREVIEW_CAGES,
  PREVIEW_GROUPS,
  PREVIEW_NEXT_FEED,
  PREVIEW_SCHEDULES,
} from './lib/preview-feeding';

export const metadata: Metadata = { title: 'Feeding' };

const FeedingPage = () => (
  <div className="flex flex-col gap-8">
    <CustomFeedingBoard groups={PREVIEW_GROUPS} initialCages={PREVIEW_CAGES} nextFeed={PREVIEW_NEXT_FEED} />
    <div className="flex w-full flex-col gap-8">
      <CustomScheduleList initialSchedules={PREVIEW_SCHEDULES} groups={PREVIEW_GROUPS} />
    </div>
  </div>
);

export default FeedingPage;
