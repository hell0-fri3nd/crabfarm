import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const STICKER_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'];
const FIELD_KEYS = ['batch', 'group', 'crabs', 'size', 'paper'];

const QrStickersLoading = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8" aria-busy="true">
    <p className="sr-only" role="status">
      Loading QR stickers…
    </p>
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-64" />
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
      <Card className="gap-6 rounded-2xl px-4 py-5 sm:px-6 sm:py-6">
        <Skeleton className="h-6 w-32" />
        {FIELD_KEYS.map((key) => (
          <div key={key} className="flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </Card>
      <Card className="gap-5 rounded-2xl px-4 py-5 sm:px-6 sm:py-6">
        <Skeleton className="h-6 w-24" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {STICKER_KEYS.map((key) => (
            <Skeleton key={key} className="aspect-square rounded-xl" />
          ))}
        </div>
      </Card>
    </div>
  </div>
);

export default QrStickersLoading;
