import CustomTabBar from '@/components/custom/custom-tab-bar';
import { getCurrentUser } from '@/lib/auth';
import { PREVIEW_HIGH_ALERT_COUNT } from '@/lib/preview';

const CustomPortalTabBar = async () => {
  const { role } = await getCurrentUser();

  return <CustomTabBar alertCount={PREVIEW_HIGH_ALERT_COUNT} role={role} />;
};

export default CustomPortalTabBar;
