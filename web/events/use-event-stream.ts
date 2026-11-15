'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useEffectEvent, useState } from 'react';
import type { z } from 'zod';

export type StreamStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

type UseEventStreamOptions<TSchema extends z.ZodType> = {
  path: string;
  events: readonly string[];
  schema: TSchema;
  onEvent?: (name: string, data: z.infer<TSchema>) => void;
};

const RETRY_AFTER_CLOSE_MS = 30_000;

const parseEvent = <TSchema extends z.ZodType>(schema: TSchema, raw: string) => {
  try {
    return schema.safeParse(JSON.parse(raw));
  } catch {
    return undefined;
  }
};

export const useEventStream = <TSchema extends z.ZodType>({
  path,
  events,
  schema,
  onEvent,
}: UseEventStreamOptions<TSchema>) => {
  const router = useRouter();
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const [lastEventAt, setLastEventAt] = useState<Date>();
  const [attempt, setAttempt] = useState(0);

  const handleEvent = useEffectEvent((name: string, raw: string) => {
    const parsed = parseEvent(schema, raw);
    if (!parsed?.success) {
      console.warn(`[stream] dropped an invalid ${name} event`, parsed?.error);
      return;
    }
    setLastEventAt(new Date());
    onEvent?.(name, parsed.data);
  });

  // A hard close is usually an expired session (the BFF answered 401): refreshing lets the server redirect to /pin
  const handleClosed = useEffectEvent(() => router.refresh());

  const eventNames = events.join(',');

  useEffect(() => {
    const source = new EventSource(`/api/stream/${path}`);
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const listeners = eventNames
      .split(',')
      .filter(Boolean)
      .map((name) => {
        const listener = (event: MessageEvent<string>) => handleEvent(name, event.data);
        source.addEventListener(name, listener);
        return [name, listener] as const;
      });

    source.onopen = () => setStatus('open');
    source.onerror = () => {
      if (source.readyState !== EventSource.CLOSED) {
        setStatus('reconnecting');
        return;
      }
      setStatus('closed');
      handleClosed();
      retryTimer = setTimeout(() => setAttempt((current) => current + 1), RETRY_AFTER_CLOSE_MS);
    };

    return () => {
      clearTimeout(retryTimer);
      listeners.forEach(([name, listener]) => source.removeEventListener(name, listener));
      source.close();
    };
  }, [path, eventNames, attempt]);

  return { status, lastEventAt };
};
