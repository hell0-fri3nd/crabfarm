import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const TILE_KEYS = ['temperature', 'ph', 'salinity', 'ammonia', 'oxygen'];
const STAT_KEYS = ['cages', 'crabs', 'batch', 'next-feed'];

const DashboardLoading = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading the dashboard…
    </p>
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-20 w-full max-w-prose" />
      <div className="flex gap-3">
        <Skeleton className="h-11 w-44" />
        <Skeleton className="h-11 w-40" />
      </div>
    </div>
    <Card className="grid grid-cols-2 gap-6 px-6 py-5 md:grid-cols-4">
      {STAT_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </Card>
    <Skeleton className="h-28 w-full rounded-xl" />
    <Card className="gap-5 rounded-2xl px-6">
      <Skeleton className="h-6 w-32" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {TILE_KEYS.map((key) => (
          <Skeleton key={key} className="h-40 rounded-xl" />
        ))}
      </div>
    </Card>
  </div>
);

export default DashboardLoading;
