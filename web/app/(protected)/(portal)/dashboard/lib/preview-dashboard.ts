import { dashboardAlertSchema, summaryStatSchema } from '../types/dashboard';

// Preview data shaped like the API until the dashboard reads /forecasts and the alerts feed

export const PREVIEW_BRIEFING =
  'Evening feeding reached 23 of 25 cages; C4 and E2 jammed. Clear them before the 6:00 AM feed.';

export const PREVIEW_SUMMARY = summaryStatSchema.array().parse([
  { id: 'cages-fed', label: 'Cages fed tonight', value: '23', unit: 'of 25' },
  { id: 'crabs-logged', label: 'Crabs logged today', value: '14', unit: null },
  { id: 'batch-vs-plan', label: 'Batch 3 vs plan', value: '+3.4', unit: '%' },
  { id: 'next-feed', label: 'Next feed', value: '6:00', unit: 'AM' },
]);

export const PREVIEW_ALERTS = dashboardAlertSchema.array().parse([
  {
    id: 'skipped-feed-c4-e2',
    severity: 'medium',
    title: 'C4 and E2 skipped the 6:00 PM feed',
    description: 'Both dispensers reported a jam. Clear them before 6:00 AM.',
    action: { label: 'Open Feeding', href: '/feeding', kind: 'feeding' },
  },
]);
