'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import CustomBrandLogo from '@/components/custom/custom-brand-logo';
import CustomFeedingStatus from '@/components/custom/custom-feeding-status';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toInitials } from '@/lib/format';
import { DASHBOARD_HREF, NAV_GROUPS, PROFILE_NAV_ITEM, isActivePath, toAlertLabel } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/stores/ui-store';

import type { ReactNode } from 'react';

type CustomAppSidebarProps = {
  user: { name: string; role: string };
  alertCount: number;
  feeding: { isOn: boolean; nextFeedLabel: string };
};

const NAV_LINK_CLASS = cn(
  'relative flex w-full flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-center text-xs leading-tight font-medium text-sidebar-foreground/75 transition-colors',
  'hover:bg-sidebar-accent hover:text-sidebar-foreground',
  'aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-semibold aria-[current=page]:text-sidebar-primary',
  'sidebar-full:h-11 sidebar-full:flex-row sidebar-full:justify-start sidebar-full:gap-3 sidebar-full:px-3 sidebar-full:py-0 sidebar-full:text-sm',
  'sidebar-icons:mx-auto sidebar-icons:size-12 sidebar-icons:p-0',
);

type CustomRailTooltipProps = {
  label: string;
  isEnabled: boolean;
  children: ReactNode;
};

const CustomRailTooltip = ({ label, isEnabled, children }: CustomRailTooltipProps) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    {isEnabled && (
      <TooltipContent side="right" className="hidden lg:block" aria-hidden>
        {label}
      </TooltipContent>
    )}
  </Tooltip>
);

const CustomAppSidebar = ({ user, alertCount, feeding }: CustomAppSidebarProps) => {
  const pathname = usePathname();
  const isCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const toggleLabel = isCollapsed ? 'Expand sidebar' : 'Collapse sidebar';

  return (
    <aside
      aria-label="Main"
      className="sticky top-0 z-10 hidden h-dvh w-22 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex sidebar-full:w-64 sidebar-icons:w-18"
    >
      <div className="flex shrink-0 flex-col gap-6 px-1.5 pt-6 pb-6 sidebar-full:px-4 sidebar-icons:px-3">
        <div className="flex flex-col items-center gap-4 sidebar-full:flex-row sidebar-full:justify-between sidebar-full:pl-2">
          <CustomBrandLogo
            height={28}
            href={DASHBOARD_HREF}
            className="text-sidebar-foreground"
            wordmarkClassName="hidden sidebar-full:inline"
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                aria-label={toggleLabel}
                aria-keyshortcuts="Control+B"
                className="hidden text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:inline-flex"
              >
                {isCollapsed ? <PanelLeftOpen className="size-4.5" aria-hidden /> : <PanelLeftClose className="size-4.5" aria-hidden />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" aria-hidden>
              {toggleLabel} (Ctrl+B)
            </TooltipContent>
          </Tooltip>
        </div>

        <CustomRailTooltip label={`${user.name} · ${user.role}`} isEnabled={isCollapsed}>
          <Link
            href={PROFILE_NAV_ITEM.href}
            aria-current={isActivePath(pathname, PROFILE_NAV_ITEM.href) ? 'page' : undefined}
            className="mx-auto flex items-center justify-center rounded-xl transition-colors hover:bg-sidebar-accent aria-[current=page]:bg-sidebar-accent sidebar-full:mx-0 sidebar-full:h-15 sidebar-full:justify-start sidebar-full:gap-3 sidebar-full:border sidebar-full:border-sidebar-border sidebar-full:bg-sidebar-foreground/3 sidebar-full:px-3"
          >
            <Avatar className="size-10 sidebar-full:size-9">
              <AvatarFallback className="bg-sidebar-primary/15 text-sm font-bold text-sidebar-primary">
                {toInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only sidebar-full:not-sr-only sidebar-full:flex sidebar-full:min-w-0 sidebar-full:flex-1 sidebar-full:flex-col">
              <span className="truncate text-sm font-semibold">{user.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{user.role}</span>
            </span>
            <ChevronRight className="hidden size-4 text-sidebar-foreground/60 sidebar-full:block" aria-hidden />
          </Link>
        </CustomRailTooltip>
      </div>

      <nav
        aria-label="Pages"
        className="min-h-0 flex-1 overflow-y-auto px-1.5 [scrollbar-color:var(--sidebar-border)_transparent] [scrollbar-width:none] sidebar-full:[scrollbar-width:thin] sidebar-full:px-4 sidebar-icons:px-3"
      >
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group[0]?.href ?? groupIndex}>
            {groupIndex > 0 && <hr className="mx-3 my-3 border-sidebar-border sidebar-full:my-4" />}
            <ul className="flex flex-col gap-1">
              {group.map(({ href, label, icon: Icon }) => {
                const isActive = isActivePath(pathname, href);
                const hasAlerts = href === DASHBOARD_HREF && alertCount > 0;

                return (
                  <li key={href}>
                    <CustomRailTooltip label={label} isEnabled={isCollapsed}>
                      <Link href={href} aria-current={isActive ? 'page' : undefined} className={NAV_LINK_CLASS}>
                        <Icon className="size-5 shrink-0" aria-hidden />
                        <span className="max-w-full sidebar-full:truncate sidebar-icons:sr-only">{label}</span>
                        {hasAlerts && (
                          <span className="absolute top-1 left-1/2 ml-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 text-xs leading-none font-semibold text-white ring-2 ring-sidebar sidebar-full:static sidebar-full:ml-auto sidebar-full:h-5 sidebar-full:min-w-5 sidebar-full:ring-0 sidebar-icons:top-1.5 sidebar-icons:ml-1">
                            <span aria-hidden>{alertCount}</span>
                            <span className="sr-only">, {toAlertLabel(alertCount)}</span>
                          </span>
                        )}
                      </Link>
                    </CustomRailTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 px-1.5 pt-4 pb-6 sidebar-full:px-4 sidebar-icons:px-3">
        <CustomRailTooltip
          label={`${feeding.isOn ? 'Feeding on' : 'Feeding off'} · Next feed ${feeding.nextFeedLabel}`}
          isEnabled={isCollapsed}
        >
          <CustomFeedingStatus isOn={feeding.isOn} nextFeedLabel={feeding.nextFeedLabel} />
        </CustomRailTooltip>
      </div>
    </aside>
  );
};

export default CustomAppSidebar;
