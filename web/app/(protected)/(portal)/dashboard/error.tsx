'use client';

import { CircleX, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const DashboardError = ({ error, reset }: DashboardErrorProps) => (
  <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
    <CircleX className="size-8 text-destructive" aria-hidden />
    <h1 className="text-2xl font-bold">The dashboard didn&apos;t load</h1>
    <p className="text-sm text-muted-foreground">
      Live readings couldn&apos;t be reached. Feeding schedules keep running. Try again, and if it keeps failing, check
      the farm&apos;s internet connection.
    </p>
    <Button type="button" className="h-11 px-5" onClick={reset}>
      <RotateCcw aria-hidden />
      Try again
    </Button>
    {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference {error.digest}</p>}
  </div>
);

export default DashboardError;
