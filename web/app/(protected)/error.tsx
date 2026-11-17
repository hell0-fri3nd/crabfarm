'use client';

import { CircleX, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAutoRetry } from '@/hooks/use-auto-retry';

type ProtectedErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const ProtectedError = ({ error, reset }: ProtectedErrorProps) => {
  const { retry, isRetrying, isAutoRetrying, secondsLeft } = useAutoRetry(reset);

  return (
    <div role="alert" className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <CircleX className="size-8 text-destructive" aria-hidden />
      <h1 className="text-2xl font-bold">CrabFarm couldn&apos;t load your account</h1>
      <p className="text-sm text-muted-foreground">
        The farm server didn&apos;t answer. Feeding schedules keep running. Try again, and if it keeps failing, check the
        farm&apos;s internet connection.
      </p>
      <Button type="button" className="h-11 px-5" disabled={isRetrying} onClick={retry}>
        <RotateCcw aria-hidden className={isRetrying ? 'animate-spin' : undefined} />
        {isRetrying ? 'Trying again…' : 'Try again'}
      </Button>
      <p aria-live="polite" className="text-xs text-muted-foreground">
        {isAutoRetrying
          ? `Trying again on its own in ${secondsLeft} s.`
          : 'Stopped trying on its own. Press Try again when the server is back.'}
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference {error.digest}</p>}
    </div>
  );
};

export default ProtectedError;
