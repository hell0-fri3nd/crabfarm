import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STEP_KEYS = ['scan', 'weigh', 'save'];

const ScanLoading = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading the scanner…
    </p>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-80 max-w-full" />
    </div>
    <div className="grid grid-cols-3 gap-4">
      {STEP_KEYS.map((key) => (
        <div key={key} className="flex flex-col gap-2">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="gap-5 rounded-2xl px-4 py-5 sm:px-6 sm:py-6">
        <Skeleton className="aspect-4/3 w-full rounded-xl" />
        <Skeleton className="mx-auto h-11 w-40" />
      </Card>
      <Card className="gap-5 rounded-2xl px-4 py-5 sm:px-6 sm:py-6">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-11" />
          <Skeleton className="h-11" />
        </div>
        <Skeleton className="h-11 w-full" />
      </Card>
    </div>
  </div>
);

export default ScanLoading;
