import CustomAuthShell from '@/components/custom/custom-auth-shell';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';

const AuthLayout = ({ children }: LayoutProps<'/'>) => (
  <CustomAuthShell headerEnd={<CustomThemeToggle />}>{children}</CustomAuthShell>
);

export default AuthLayout;
