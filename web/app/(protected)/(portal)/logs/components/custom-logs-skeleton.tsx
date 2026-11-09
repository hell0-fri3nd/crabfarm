import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];

const CustomLogsSkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading logs…
    </p>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-5 w-64" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-11 w-56" />
        <Skeleton className="h-11 w-36" />
      </div>
    </div>
    <div className="flex flex-col gap-3 lg:flex-row">
      <Skeleton className="h-11 flex-1" />
      <Skeleton className="h-11 w-full lg:w-40" />
      <Skeleton className="h-11 w-full lg:w-40" />
    </div>
    <Card className="gap-0 py-0">
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-6 border-b border-border px-6 py-4 last:border-b-0">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </Card>
  </div>
);

export default CustomLogsSkeleton;
