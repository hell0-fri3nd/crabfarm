'use client';

import { useState } from 'react';

import { useEventStream } from '@/events/use-event-stream';

import { dashboardSummarySchema } from '../types/dashboard';

import type { DashboardSummary } from '../types/dashboard';

const DASHBOARD_STREAM_PATH = 'dashboard/stream';
const SUMMARY_EVENTS = ['dashboard.summary'] as const;

export const useDashboardSummaryStream = (initialSummary: DashboardSummary) => {
  const [summary, setSummary] = useState(initialSummary);

  useEventStream({
    path: DASHBOARD_STREAM_PATH,
    events: SUMMARY_EVENTS,
    schema: dashboardSummarySchema,
    onEvent: (_, next) => setSummary(next),
  });

  return summary;
};
