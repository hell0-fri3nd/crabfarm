import { Skeleton } from '@/components/ui/skeleton';

const CHIP_KEYS = ['ammonia', 'oxygen', 'temperature', 'ph', 'salinity'];

const AssistantLoading = () => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-busy="true">
    <p className="sr-only" role="status">
      Loading the assistant…
    </p>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-4 w-full max-w-sm" />
    </div>
    <div className="flex flex-wrap gap-2">
      {CHIP_KEYS.map((key) => (
        <Skeleton key={key} className="h-8 w-28 rounded-full" />
      ))}
    </div>
    <Skeleton className="h-80 w-full rounded-2xl" />
    <Skeleton className="h-14 w-full rounded-2xl" />
  </div>
);

export default AssistantLoading;
