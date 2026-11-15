import { Suspense } from 'react';
import { ShieldAlert } from 'lucide-react';

import type { Metadata } from 'next';

import CustomEmptyState from '@/components/custom/custom-empty-state';
import { Card } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth';

import { usersApi } from './api/users-api';
import CustomRoleGuide from './components/custom-role-guide';
import CustomUsersBoard from './components/custom-users-board';
import { toFarmUser } from './lib/role-meta';
import UsersLoading from './loading';
import { ADMIN_ROLE } from './types/users';

export const metadata: Metadata = { title: 'Users' };

const FORBIDDEN = 403;

const UsersBoardLoader = async () => {
  const [self, result] = await Promise.all([getCurrentUser(), usersApi.list()]);

  if (!result.ok) {
    return (
      <Card className="py-0">
        <CustomEmptyState
          icon={ShieldAlert}
          title={result.status === FORBIDDEN ? "You can't manage users" : "Couldn't load the team"}
          hint={result.status === FORBIDDEN ? 'Ask an admin if you need access.' : result.message}
        />
      </Card>
    );
  }

  const now = new Date();
  return (
    <CustomUsersBoard
      initialUsers={result.data.items.map((user) => toFarmUser(user, self.id, now))}
      canManageAdmins={self.role === ADMIN_ROLE}
    />
  );
};

const UsersPage = () => (
  <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
    <Suspense fallback={<UsersLoading />}>
      <UsersBoardLoader />
    </Suspense>
    <CustomRoleGuide />
  </div>
);

export default UsersPage;
