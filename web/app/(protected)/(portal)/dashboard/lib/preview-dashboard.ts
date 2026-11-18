import { summaryStatSchema } from '../types/dashboard';

// Preview data shaped like the API until the dashboard reads the feeding and crab log totals

export const PREVIEW_BRIEFING = 'Check the water readings and the feeding schedules.';

export const PREVIEW_SUMMARY = summaryStatSchema.array().parse([
  { id: 'cages-fed', label: 'Cages fed tonight', value: '23', unit: 'of 25' },
  { id: 'crabs-logged', label: 'Crabs logged today', value: '14', unit: null },
  { id: 'next-feed', label: 'Next feed', value: '6:00', unit: 'AM' },
]);
