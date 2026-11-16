import { Suspense } from 'react';
import { connection } from 'next/server';
import { CircleX } from 'lucide-react';

import type { Metadata } from 'next';

import { crabsApi } from '@/api/crabs-api';
import { teamApi } from '@/api/team-api';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/permissions';

import { auditEventsApi } from './api/audit-events-api';
import CustomActivitySkeleton from './components/custom-activity-skeleton';
import CustomActivityView from './components/custom-activity-view';
import { groupByDay, toAuditQuery, toEntry } from './lib/activity-query';
import { activitySearchParamsSchema } from './types/activity';

export const metadata: Metadata = { title: 'Activity' };

type ActivityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ActivityLoader = async ({ searchParams }: ActivityPageProps) => {
  await connection();
  const params = activitySearchParamsSchema.parse(await searchParams);
  const now = new Date();
  const self = await getCurrentUser();
  const canSeeEveryone = can(self.role, 'activity.view_everyone');

  const [events, crabs, team] = await Promise.all([
    auditEventsApi.list(toAuditQuery(params, now, canSeeEveryone)),
    crabsApi.list(),
    canSeeEveryone ? teamApi.list() : null,
  ]);

  if (!events.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState icon={CircleX} title="Couldn't load activity" hint={events.message} />
      </Card>
    );
  }

  const members = team?.ok ? team.data.items : [];
  const actors = { selfId: self.id, selfName: self.name, names: new Map(members.map(({ id, name }) => [id, name])) };
  const crabList = crabs.ok ? crabs.data : [];
  const people = members.filter(({ id }) => id !== self.id).map(({ id, name }) => ({ value: id, label: name }));

  return (
    <CustomActivityView
      groups={groupByDay(events.data.items, (event) => toEntry(event, crabList, actors), now)}
      shownCount={events.data.items.length}
      total={events.data.total}
      canSeeEveryone={canSeeEveryone}
      people={people}
    />
  );
};

const ActivityPage = ({ searchParams }: ActivityPageProps) => (
  <Suspense fallback={<CustomActivitySkeleton />}>
    <ActivityLoader searchParams={searchParams} />
  </Suspense>
);

export default ActivityPage;
