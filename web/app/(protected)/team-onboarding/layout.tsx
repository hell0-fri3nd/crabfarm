import CustomAuthShell from '@/components/custom/custom-auth-shell';
import CustomSessionGate from '@/components/custom/custom-session-gate';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';

const TeamOnboardingLayout = ({ children }: LayoutProps<'/team-onboarding'>) => (
  <CustomSessionGate stage="onboarding">
    <CustomAuthShell headerEnd={<CustomThemeToggle />}>{children}</CustomAuthShell>
  </CustomSessionGate>
);

export default TeamOnboardingLayout;
