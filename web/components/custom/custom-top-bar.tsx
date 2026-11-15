import CustomAskAiButton from '@/components/custom/custom-ask-ai-button';
import CustomBrandLogo from '@/components/custom/custom-brand-logo';
import CustomLiveStatus from '@/components/custom/custom-live-status';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';
import { DASHBOARD_HREF } from '@/lib/navigation';

const CustomTopBar = () => (
  <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
    <div className="flex min-w-0 items-center gap-4">
      <CustomBrandLogo height={28} href={DASHBOARD_HREF} className="sidebar-full:hidden" />
      <CustomLiveStatus />
    </div>
    <div className="flex items-center gap-2">
      <CustomThemeToggle />
      <CustomAskAiButton />
    </div>
  </header>
);

export default CustomTopBar;
