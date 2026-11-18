import { Suspense } from 'react';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';
import { firstFailure } from '@/lib/api-result';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import { cagesApi } from './api/cages-api';
import { schedulesApi } from './api/schedules-api';
import CustomFeedingBoard from './components/custom-feeding-board';
import CustomScheduleList from './components/custom-schedule-list';
import { toCageGroups } from './lib/feeding-format';
import FeedingLoading from './loading';

export const metadata: Metadata = { title: 'Feeding' };

const FeedingLoader = async () => {
  const [cages, schedules, self] = await Promise.all([cagesApi.list(), schedulesApi.list(), getCurrentUser()]);

  if (!cages.ok || !schedules.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState
          icon={CircleX}
          title="Couldn't load feeding"
          hint={firstFailure(cages, schedules) ?? 'Try again in a moment.'}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <CustomFeedingBoard initialCages={cages.data.items} />
      <CustomScheduleList
        initialSchedules={schedules.data.items}
        groups={toCageGroups(cages.data.items)}
        canManage={can(self.role, 'schedules.manage')}
      />
    </div>
  );
};

const FeedingPage = () => (
  <Suspense fallback={<FeedingLoading />}>
    <FeedingLoader />
  </Suspense>
);

export default FeedingPage;
