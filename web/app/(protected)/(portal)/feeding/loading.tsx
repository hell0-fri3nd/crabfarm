import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const GROUP_KEYS = ['a', 'b', 'c'];
const ROW_KEYS = ['1', '2', '3', '4', '5'];

const FeedingLoading = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading feeding…
    </p>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-11 w-24" />
      </div>
    </div>
    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
      {GROUP_KEYS.map((group) => (
        <Card key={group} className="gap-4 rounded-2xl px-4 py-5 sm:px-6 sm:py-6">
          <Skeleton className="h-6 w-24" />
          {ROW_KEYS.map((row) => (
            <Skeleton key={row} className="h-11 w-full" />
          ))}
        </Card>
      ))}
    </div>
  </div>
);

export default FeedingLoading;
