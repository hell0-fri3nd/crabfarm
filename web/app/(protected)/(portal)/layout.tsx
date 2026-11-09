import CustomAppShell from '@/components/custom/custom-app-shell';
import CustomAppSidebar from '@/components/custom/custom-app-sidebar';
import CustomBubbles from '@/components/custom/custom-bubbles';
import CustomFooter from '@/components/custom/custom-footer';
import CustomTabBar from '@/components/custom/custom-tab-bar';
import CustomTopBar from '@/components/custom/custom-top-bar';
import { PREVIEW_FEEDING, PREVIEW_HIGH_ALERT_COUNT, PREVIEW_USER } from '@/lib/preview';

const PortalLayout = ({ children }: LayoutProps<'/'>) => (
  <CustomAppShell>
    <a
      href="#content"
      className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to main content
    </a>
    <CustomAppSidebar user={PREVIEW_USER} alertCount={PREVIEW_HIGH_ALERT_COUNT} feeding={PREVIEW_FEEDING} />
    <div className="relative isolate flex min-w-0 flex-1 flex-col">
      <CustomBubbles className="fixed" />
      <CustomTopBar liveLabel="updated 12 s ago" />
      <main id="content" tabIndex={-1} className="flex-1 px-4 pt-6 pb-28 outline-none sm:pt-8 md:px-8 md:pb-12">
        {children}
      </main>
      <CustomFooter variant="split" className="mb-20 md:mb-0 max-md:[body:has([data-fullscreen])_&]:hidden" />
      <CustomTabBar alertCount={PREVIEW_HIGH_ALERT_COUNT} />
    </div>
  </CustomAppShell>
);

export default PortalLayout;
