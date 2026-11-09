// Stand-ins for GET /auth/me and the feeding status until the BFF is wired up
export const PREVIEW_USER = { name: 'Art Lisboa', role: 'Admin' } as const;

export const PREVIEW_FEEDING = { isOn: true, nextFeedLabel: '6:00 AM' } as const;

export const PREVIEW_HIGH_ALERT_COUNT = 1;
