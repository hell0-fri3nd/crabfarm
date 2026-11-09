import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const ROW_KEYS = ['1', '2', '3', '4', '5'];

const UsersLoading = () => (
  <div className="flex w-full flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading users…
    </p>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-5 w-64" />
      </div>
      <Skeleton className="h-11 w-full sm:w-36" />
    </div>
    <Skeleton className="h-11 w-full sm:max-w-md" />
    <Card className="gap-3 px-4 py-5 sm:px-6">
      {ROW_KEYS.map((row) => (
        <Skeleton key={row} className="h-14 w-full" />
      ))}
    </Card>
  </div>
);

export default UsersLoading;
