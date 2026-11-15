import CustomAppSidebar from '@/components/custom/custom-app-sidebar';
import { getCurrentUser } from '@/lib/auth';
import { PREVIEW_FEEDING, PREVIEW_HIGH_ALERT_COUNT } from '@/lib/preview';
import { toRoleLabel } from '@/types/session';

const CustomPortalSidebar = async () => {
  const { name, role } = await getCurrentUser();

  return (
    <CustomAppSidebar
      user={{ name, role: toRoleLabel(role) }}
      alertCount={PREVIEW_HIGH_ALERT_COUNT}
      feeding={PREVIEW_FEEDING}
    />
  );
};

export default CustomPortalSidebar;
