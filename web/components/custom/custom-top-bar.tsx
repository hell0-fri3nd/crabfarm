import CustomAskAiButton from '@/components/custom/custom-ask-ai-button';
import CustomBrandLogo from '@/components/custom/custom-brand-logo';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';
import { DASHBOARD_HREF } from '@/lib/navigation';

type CustomTopBarProps = {
  liveLabel: string;
};

const CustomTopBar = ({ liveLabel }: CustomTopBarProps) => (
  <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
    <div className="flex min-w-0 items-center gap-4">
      <CustomBrandLogo height={28} href={DASHBOARD_HREF} className="sidebar-full:hidden" />
      <p
        role="status"
        className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs sm:flex"
      >
        <span aria-hidden className="size-2 rounded-full bg-primary motion-safe:animate-pulse" />
        <span className="font-semibold text-primary">Live</span>
        <span className="text-muted-foreground">{liveLabel}</span>
      </p>
    </div>
    <div className="flex items-center gap-2">
      <CustomThemeToggle />
      <CustomAskAiButton />
    </div>
  </header>
);

export default CustomTopBar;
