import { Suspense } from 'react';

import type { Metadata } from 'next';

import CustomRoleGuide from './components/custom-role-guide';
import CustomUsersBoard from './components/custom-users-board';
import { PREVIEW_USERS } from './lib/preview-users';
import UsersLoading from './loading';

export const metadata: Metadata = { title: 'Users' };

const UsersPage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <Suspense fallback={<UsersLoading />}>
      <CustomUsersBoard initialUsers={PREVIEW_USERS} />
    </Suspense>
    <CustomRoleGuide />
  </div>
);

export default UsersPage;
