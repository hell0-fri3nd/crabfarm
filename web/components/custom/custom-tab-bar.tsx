'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';

import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DASHBOARD_HREF,
  MORE_SHEET_ITEMS,
  SCAN_HREF,
  TAB_BAR_ITEMS,
  isActivePath,
  toAlertLabel,
} from '@/lib/navigation';
import { cn } from '@/lib/utils';

type CustomTabBarProps = {
  alertCount: number;
};

const TAB_CLASS =
  'relative flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted-foreground aria-[current=page]:text-primary';

const SHEET_LINK_CLASS =
  'flex h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-accent aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-primary';

const CustomTabBar = ({ alertCount }: CustomTabBarProps) => {
  const pathname = usePathname();
  const isMoreActive = MORE_SHEET_ITEMS.some(({ href }) => isActivePath(pathname, href));

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.375rem)] backdrop-blur md:hidden"
    >
      <ul className="flex items-end gap-1">
        {TAB_BAR_ITEMS.map(({ href, label, tabLabel, icon: Icon }) => {
          const isActive = isActivePath(pathname, href);
          const hasAlerts = href === DASHBOARD_HREF && alertCount > 0;

          return (
            <li key={href} className="flex flex-1">
              <Link href={href} aria-current={isActive ? 'page' : undefined} className={TAB_CLASS}>
                {href === SCAN_HREF ? (
                  <span className="-mt-6 flex size-13 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
                    <Icon className="size-6" aria-hidden />
                  </span>
                ) : (
                  <span className="relative">
                    <Icon className="size-5.5" aria-hidden />
                    {hasAlerts && (
                      <span aria-hidden className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-destructive ring-2 ring-background" />
                    )}
                  </span>
                )}
                <span>{tabLabel ?? label}</span>
                {hasAlerts && <span className="sr-only">, {toAlertLabel(alertCount)}</span>}
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1">
          <Sheet>
            <SheetTrigger className={cn(TAB_CLASS, 'cursor-pointer', isMoreActive && 'text-primary')}>
              <Menu className="size-5.5" aria-hidden />
              More
            </SheetTrigger>
            <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-3xl px-3 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
              <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center justify-between px-3 pb-2">
                <SheetTitle className="text-lg font-semibold">More</SheetTitle>
                <SheetClose className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border text-muted-foreground hover:text-foreground">
                  <X className="size-4.5" aria-hidden />
                  <span className="sr-only">Close</span>
                </SheetClose>
              </div>
              <SheetDescription className="sr-only">Other pages and your account</SheetDescription>
              <ul className="flex flex-col gap-1">
                {MORE_SHEET_ITEMS.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <SheetClose asChild>
                      <Link
                        href={href}
                        aria-current={isActivePath(pathname, href) ? 'page' : undefined}
                        className={SHEET_LINK_CLASS}
                      >
                        <Icon className="size-4.5" aria-hidden />
                        {label}
                      </Link>
                    </SheetClose>
                  </li>
                ))}
                <li className="mx-3 my-2 border-t border-border" aria-hidden />
                <li>
                  <SheetClose asChild>
                    <Link href="/sign-in" className={cn(SHEET_LINK_CLASS, 'font-semibold text-destructive hover:bg-destructive/10')}>
                      <LogOut className="size-4.5" aria-hidden />
                      Sign out
                    </Link>
                  </SheetClose>
                </li>
              </ul>
            </SheetContent>
          </Sheet>
        </li>
      </ul>
    </nav>
  );
};

export default CustomTabBar;
