'use client';

import { useSyncExternalStore } from 'react';

type CustomGreetingProps = {
  firstName: string;
};

const MINUTE_MS = 60_000;

const subscribe = (onChange: () => void) => {
  const timer = window.setInterval(onChange, MINUTE_MS / 2);
  return () => window.clearInterval(timer);
};

const getMinute = () => Math.floor(Date.now() / MINUTE_MS);

const getServerMinute = () => null;

const toGreeting = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });

const CustomGreeting = ({ firstName }: CustomGreetingProps) => {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  const now = minute === null ? null : new Date(minute * MINUTE_MS);

  return (
    <div>
      <p className="min-h-5 text-sm font-medium text-muted-foreground">{now && DATE_FORMAT.format(now)}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
        {now ? toGreeting(now.getHours()) : 'Hello'}, {firstName}.
      </h1>
    </div>
  );
};

export default CustomGreeting;
