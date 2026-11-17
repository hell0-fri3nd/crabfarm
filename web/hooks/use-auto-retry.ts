'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const RETRY_EVERY_SECONDS = 5;
// About a minute of retries covers an API restart (model load included); after that the button is the way back
const MAX_AUTO_RETRIES = 12;

// For error.tsx boundaries: reset() alone only re-renders what the browser already has, so a failed server
// fetch would fail again; refreshing first re-runs the server render, and reset() then shows the result
export const useAutoRetry = (reset: () => void) => {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();
  const [attempts, setAttempts] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(RETRY_EVERY_SECONDS);
  const isAutoRetrying = attempts < MAX_AUTO_RETRIES;

  const retry = useCallback(() => {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }, [router, reset]);

  useEffect(() => {
    if (!isAutoRetrying) return;
    let deadline = Date.now() + RETRY_EVERY_SECONDS * 1000;
    const timer = window.setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      if (left > 0) {
        setSecondsLeft(left);
        return;
      }
      deadline = Date.now() + RETRY_EVERY_SECONDS * 1000;
      setSecondsLeft(RETRY_EVERY_SECONDS);
      setAttempts((count) => count + 1);
      retry();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isAutoRetrying, retry]);

  // Coming back online is the most likely moment the server answers again
  useEffect(() => {
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retry]);

  return { retry, isRetrying, isAutoRetrying, secondsLeft };
};
