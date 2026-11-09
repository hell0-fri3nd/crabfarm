import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ROW_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];
const CHIP_KEYS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];

const CustomActivitySkeleton = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading activity…
    </p>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-32" />
      <Skeleton className="h-5 w-72" />
    </div>
    <div className="flex flex-col gap-3 lg:flex-row">
      <Skeleton className="h-11 w-full lg:max-w-md" />
      <div className="flex flex-wrap gap-2">
        {CHIP_KEYS.map((key) => (
          <Skeleton key={key} className="h-9 w-20 rounded-full" />
        ))}
      </div>
    </div>
    <Card className="gap-0 py-0">
      <Skeleton className="m-4 h-4 w-16" />
      {ROW_KEYS.map((key) => (
        <div key={key} className="flex items-center gap-6 border-t border-border px-6 py-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </Card>
  </div>
);

export default CustomActivitySkeleton;
