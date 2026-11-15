import { Skeleton } from '@/components/ui/skeleton';

const CustomPinSkeleton = () => (
  <div className="flex w-full max-w-100 flex-col items-center" aria-busy aria-label="Loading">
    <Skeleton className="size-18 rounded-full" />
    <Skeleton className="mt-4 h-9 w-48" />
    <Skeleton className="mt-4 h-5 w-40" />
    <Skeleton className="mt-4 h-14 w-62" />
  </div>
);

export default CustomPinSkeleton;
