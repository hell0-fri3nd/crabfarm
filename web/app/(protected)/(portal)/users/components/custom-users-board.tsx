'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, UserPlus, X } from 'lucide-react';

import CustomSearchInput from '@/components/custom/custom-search-input';
import CustomEmptyState from '@/components/custom/custom-empty-state';
import CustomPageHeader from '@/components/custom/custom-page-header';
import CustomStatusPill from '@/components/custom/custom-status-pill';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { notify } from '@/lib/notify';

import CustomInviteUserDialog from './custom-invite-user-dialog';
import CustomRoleSelect from './custom-role-select';
import CustomUserActions from './custom-user-actions';
import CustomUserConfirmDialog from './custom-user-confirm-dialog';
import CustomUserIdentity from './custom-user-identity';
import { ROLE_LABELS, matchesSearch } from '../lib/role-meta';
import { usersSearchSchema } from '../types/users';

import type { FarmUser, InviteUserInput, Role, UserAction, UserStatus } from '../types/users';

type CustomUsersBoardProps = {
  initialUsers: FarmUser[];
};

const INVITE_EXPIRY_LABEL = 'Invite expires in 24 h';

const CustomUsersBoard = ({ initialUsers }: CustomUsersBoardProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { q: query } = usersSearchSchema.parse({ q: searchParams.get('q') ?? '' });
  const [users, setUsers] = useState(initialUsers);
  const [pendingAction, setPendingAction] = useState<UserAction | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  const visibleUsers = users.filter((user) => matchesSearch(user, query));
  const countOf = (status: UserStatus) => users.filter((user) => user.status === status).length;

  const setQuery = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value.trim()) params.set('q', value);
    else params.delete('q');
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  };

  const updateUser = (id: string, changes: Partial<FarmUser>) =>
    setUsers((current) => current.map((user) => (user.id === id ? { ...user, ...changes } : user)));

  const handleConfirm = (action: UserAction) => {
    setPendingAction(null);
    const { user } = action;

    if (action.kind === 'reset') {
      notify.success(`Reset sent to ${user.name}`, {
        description: "They'll set a new password and PIN on their next sign-in.",
      });
      return;
    }

    if (action.kind === 'deactivate') {
      updateUser(user.id, { status: 'deactivated' });
      notify.undo(`${user.name} deactivated`, {
        description: 'Signed out everywhere. Their logs stay.',
        onUndo: () => updateUser(user.id, { status: user.status }),
      });
      return;
    }

    updateUser(user.id, { role: action.role });
    notify.success(`${user.name} is now ${action.role === 'admin' ? 'an' : 'a'} ${ROLE_LABELS[action.role]}`);
  };

  const handleRoleChange = (user: FarmUser, role: Role) => setPendingAction({ kind: 'role', user, role });

  const handleReactivate = (user: FarmUser) => {
    updateUser(user.id, { status: 'active' });
    notify.success(`${user.name} reactivated`, { description: 'They can sign in again with their current password.' });
  };

  const handleResendInvite = (user: FarmUser) => {
    updateUser(user.id, { last_active_label: INVITE_EXPIRY_LABEL });
    notify.success('Invite sent again', { description: `${user.email} · expires in 24 hours` });
  };

  const handleInvite = ({ name, email, role }: InviteUserInput) => {
    setUsers((current) => [
      ...current,
      { id: `u-${Date.now()}`, name, email, role, status: 'invited', last_active_label: INVITE_EXPIRY_LABEL, is_self: false },
    ]);
    setIsInviteOpen(false);
    notify.success(`Invite sent to ${name}`, { description: `${email} · ${ROLE_LABELS[role]}` });
  };

  const actionHandlers = {
    onReset: (user: FarmUser) => setPendingAction({ kind: 'reset', user }),
    onDeactivate: (user: FarmUser) => setPendingAction({ kind: 'deactivate', user }),
    onResendInvite: handleResendInvite,
    onReactivate: handleReactivate,
  };

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="Users"
        status={
          <span>
            {countOf('active')} active · {countOf('invited')} invited · {countOf('deactivated')} deactivated
          </span>
        }
        actions={
          <Button type="button" className="h-11 px-5" onClick={() => setIsInviteOpen(true)}>
            <UserPlus aria-hidden />
            Invite user
          </Button>
        }
      />

      <CustomSearchInput
        id="users-search"
        label="Search users by name or email"
        placeholder="Name or email"
        value={query}
        onChange={setQuery}
        className="w-full flex-none sm:max-w-md"
      />

      {visibleUsers.length === 0 ? (
        <Card className="py-0">
          <CustomEmptyState
            icon={Search}
            title={`No one matches “${query}”`}
            hint="Check the spelling, or search by email instead."
            action={
              <Button type="button" variant="outline" className="h-11" onClick={() => setQuery('')}>
                <X aria-hidden />
                Clear search
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <Card className="hidden gap-0 overflow-hidden py-0 lg:flex">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="h-11 pl-6">User</TableHead>
                  <TableHead className="h-11">Role</TableHead>
                  <TableHead className="h-11">Status</TableHead>
                  <TableHead className="h-11">Last active</TableHead>
                  <TableHead className="h-11 pr-6 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="max-w-72 py-3 pl-6">
                      <CustomUserIdentity user={user} />
                    </TableCell>
                    <TableCell className="py-3">
                      <CustomRoleSelect user={user} onChange={(role) => handleRoleChange(user, role)} />
                    </TableCell>
                    <TableCell className="py-3">
                      <CustomStatusPill status={user.status} className="text-sm" />
                    </TableCell>
                    <TableCell className="py-3 text-sm whitespace-normal text-muted-foreground">
                      {user.last_active_label}
                    </TableCell>
                    <TableCell className="py-3 pr-6">
                      <CustomUserActions user={user} {...actionHandlers} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:hidden">
            {visibleUsers.map((user) => (
              <li key={user.id}>
                <Card className="gap-4 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <CustomUserIdentity user={user} />
                    <CustomStatusPill status={user.status} className="mt-1 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground">Last active · {user.last_active_label}</p>
                  <CustomRoleSelect user={user} onChange={(role) => handleRoleChange(user, role)} />
                  <CustomUserActions user={user} {...actionHandlers} className="[&>*]:flex-1" />
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <CustomInviteUserDialog
        isOpen={isInviteOpen}
        takenEmails={users.map(({ email }) => email)}
        onOpenChange={setIsInviteOpen}
        onInvite={handleInvite}
      />
      <CustomUserConfirmDialog action={pendingAction} onConfirm={handleConfirm} onCancel={() => setPendingAction(null)} />
    </div>
  );
};

export default CustomUsersBoard;
