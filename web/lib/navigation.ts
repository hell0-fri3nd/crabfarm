import { Bot, CalendarClock, History, LayoutDashboard, QrCode, ScanLine, ScrollText, UserRound, Users } from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  tabLabel?: string;
  icon: LucideIcon;
};

export const NAV_GROUPS: NavItem[][] = [
  [
    { href: '/dashboard', label: 'Dashboard', tabLabel: 'Home', icon: LayoutDashboard },
    { href: '/logs', label: 'Logs', icon: ScrollText },
  ],
  [
    { href: '/feeding', label: 'Feeding', icon: CalendarClock },
    { href: '/qr-stickers', label: 'QR stickers', icon: QrCode },
    { href: '/scan', label: 'Scan crab', tabLabel: 'Scan', icon: ScanLine },
  ],
  [{ href: '/assistant', label: 'Assistant', icon: Bot }],
  [
    { href: '/users', label: 'Users', icon: Users },
    { href: '/activity', label: 'Activity', icon: History },
  ],
];

export const PROFILE_NAV_ITEM: NavItem = { href: '/profile', label: 'My profile', icon: UserRound };

export const DASHBOARD_HREF = '/dashboard';

export const SCAN_HREF = '/scan';

const TAB_BAR_HREFS = ['/dashboard', '/feeding', SCAN_HREF, '/logs'];

const ALL_NAV_ITEMS = NAV_GROUPS.flat();

export const TAB_BAR_ITEMS = TAB_BAR_HREFS.flatMap((href) => ALL_NAV_ITEMS.filter((item) => item.href === href));

export const MORE_SHEET_ITEMS = [...ALL_NAV_ITEMS.filter(({ href }) => !TAB_BAR_HREFS.includes(href)), PROFILE_NAV_ITEM];

export const isActivePath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

export const toAlertLabel = (count: number) => `${count} ${count === 1 ? 'alert' : 'alerts'}`;
