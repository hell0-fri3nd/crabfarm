import type { Metadata } from 'next';

import CustomPageHeader from '@/components/custom/custom-page-header';

import CustomIdentityCard from './components/custom-identity-card';
import CustomPasswordCard from './components/custom-password-card';
import CustomPinCard from './components/custom-pin-card';
import CustomPreferencesCard from './components/custom-preferences-card';
import CustomRecentActivityCard from './components/custom-recent-activity-card';
import CustomSignOutButton from './components/custom-sign-out-button';
import { PREVIEW_PROFILE, PREVIEW_RECENT_ACTIVITY } from './lib/preview-profile';

export const metadata: Metadata = { title: 'My profile' };

const ProfilePage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <CustomPageHeader
      title="My profile"
      status={<span>Password {PREVIEW_PROFILE.password_changed_label.toLowerCase()}</span>}
      actions={<CustomSignOutButton />}
    />
    <CustomIdentityCard profile={PREVIEW_PROFILE} />
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <CustomPasswordCard name={PREVIEW_PROFILE.name} changedLabel={PREVIEW_PROFILE.password_changed_label} />
      <CustomPinCard />
      <CustomPreferencesCard />
      <CustomRecentActivityCard items={PREVIEW_RECENT_ACTIVITY} />
    </div>
  </div>
);

export default ProfilePage;
