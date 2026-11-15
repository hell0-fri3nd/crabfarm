import type { Metadata } from 'next';

import CustomPageHeader from '@/components/custom/custom-page-header';
import { getCurrentUser } from '@/lib/auth';
import { toTimeAgo } from '@/lib/format';
import { toRoleLabel } from '@/types/session';

import CustomIdentityCard from './components/custom-identity-card';
import CustomPasswordCard from './components/custom-password-card';
import CustomPinCard from './components/custom-pin-card';
import CustomPreferencesCard from './components/custom-preferences-card';
import CustomRecentActivityCard from './components/custom-recent-activity-card';
import CustomSignOutButton from './components/custom-sign-out-button';
import { accountApi } from './api/account-api';
import { RECENT_ACTIVITY_LIMIT, toRecentActivity } from './lib/activity';

export const metadata: Metadata = { title: 'My profile' };

const ProfilePage = async () => {
  const [{ name, role, email, updated_at }, activity] = await Promise.all([
    getCurrentUser(),
    accountApi.activity(RECENT_ACTIVITY_LIMIT),
  ]);
  const recentActivity = activity.ok ? toRecentActivity(activity.data) : [];
  const passwordChangedLabel = updated_at ? `Changed ${toTimeAgo(updated_at)}` : 'Never changed';

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <CustomPageHeader
        title="My profile"
        status={<span>Password {passwordChangedLabel.toLowerCase()}</span>}
        actions={<CustomSignOutButton />}
      />
      <CustomIdentityCard
        profile={{ name, email, role: toRoleLabel(role), password_changed_label: passwordChangedLabel }}
      />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CustomPasswordCard name={name} changedLabel={passwordChangedLabel} />
        <CustomPinCard />
        <CustomPreferencesCard />
        <CustomRecentActivityCard items={recentActivity} isUnavailable={!activity.ok} />
      </div>
    </div>
  );
};

export default ProfilePage;
