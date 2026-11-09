import { Skeleton } from '@/components/ui/skeleton';

const CARD_KEYS = ['password', 'pin', 'preferences', 'activity'];

const ProfileLoading = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading your profile…
    </p>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="h-5 w-64" />
    </div>
    <Skeleton className="h-28 w-full rounded-2xl" />
    <div className="grid gap-5 lg:grid-cols-2">
      {CARD_KEYS.map((key) => (
        <Skeleton key={key} className="h-96 rounded-2xl" />
      ))}
    </div>
  </div>
);

export default ProfileLoading;
