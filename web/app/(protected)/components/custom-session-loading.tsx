import { Skeleton } from '@/components/ui/skeleton';

const CustomSessionLoading = () => (
  <div className="flex min-h-svh flex-col gap-6 p-4 md:p-8" aria-busy aria-label="Checking your session">
    <Skeleton className="h-9 w-56" />
    <Skeleton className="h-5 w-72" />
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);

export default CustomSessionLoading;
