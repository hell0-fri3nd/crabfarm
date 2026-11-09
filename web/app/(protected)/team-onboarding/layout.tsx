import CustomAuthShell from '@/components/custom/custom-auth-shell';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';

const TeamOnboardingLayout = ({ children }: LayoutProps<'/team-onboarding'>) => (
  <CustomAuthShell headerEnd={<CustomThemeToggle />}>{children}</CustomAuthShell>
);

export default TeamOnboardingLayout;
