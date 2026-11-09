import { PREVIEW_USER } from '@/lib/preview';

import { profileSchema, recentActivitySchema } from '../types/profile';

// Stand-ins for GET /auth/me and the audit feed until the BFF is wired up

export const PREVIEW_PROFILE = profileSchema.parse({
  name: PREVIEW_USER.name,
  email: 'art@farm.ph',
  role: PREVIEW_USER.role,
  password_changed_label: 'Changed 41 days ago',
});

export const PREVIEW_RECENT_ACTIVITY = recentActivitySchema.array().parse([
  { id: 'log-b3-b-02', area: 'Data', title: 'Logged crab B3-B-02', at_label: 'Today, 9:42 PM' },
  { id: 'ask-ammonia', area: 'Assistant', title: 'Asked about high ammonia', at_label: 'Today, 9:31 PM' },
  { id: 'role-jun', area: 'Users', title: 'Made Jun Reyes an Operator', at_label: 'Yesterday, 5:24 PM' },
  { id: 'sign-out', area: 'Auth', title: 'Signed out', at_label: 'Yesterday, 2:43 PM' },
]);

export const SIMULATED_SAVE_MS = 700;

export const simulateSave = () => new Promise((resolve) => window.setTimeout(resolve, SIMULATED_SAVE_MS));
