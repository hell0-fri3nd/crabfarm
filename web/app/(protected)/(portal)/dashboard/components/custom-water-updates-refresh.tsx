'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const LOG_INTERVAL_MS = 30 * 60 * 1000;
// Gives the worker time to save the new slot before the page reads it
const SAVE_MARGIN_MS = 15_000;

const toNextRefreshDelay = (now: number) => LOG_INTERVAL_MS - (now % LOG_INTERVAL_MS) + SAVE_MARGIN_MS;

const CustomWaterUpdatesRefresh = () => {
  const router = useRouter();

  useEffect(() => {
    let timer: number;

    const schedule = () => {
      timer = window.setTimeout(() => {
        router.refresh();
        schedule();
      }, toNextRefreshDelay(Date.now()));
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
};

export default CustomWaterUpdatesRefresh;
