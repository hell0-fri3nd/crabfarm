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
import { addUser } from '../actions/add-user';
import { changeRole } from '../actions/change-role';
import { deactivateUser, reactivateUser, resetUserCredentials } from '../actions/user-status';
import { ROLE_LABELS, matchesSearch, toFarmUser, toRoleArticle, toStatus } from '../lib/role-meta';
import { usersSearchSchema } from '../types/users';

import type { FieldError } from '@/types/api';
import type { ApiUser, FarmUser, InviteUserInput, Role, UserAction, UserStatus } from '../types/users';

type CustomUsersBoardProps = {
  initialUsers: FarmUser[];
  canManageAdmins: boolean;
};

const CustomUsersBoard = ({ initialUsers, canManageAdmins }: CustomUsersBoardProps) => {
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

  // Keeps the row's "last active" label; mutation responses don't carry it
  const applyApiUser = (apiUser: ApiUser) => updateUser(apiUser.id, { role: apiUser.role, status: toStatus(apiUser) });

  const failWith = (title: string, result: { message: string; errors: { message: string }[] }) =>
    notify.error(title, { description: result.errors[0]?.message ?? result.message });

  const reactivate = async (user: FarmUser) => {
    const result = await reactivateUser(user.id);
    if (!result.ok) return failWith(`Couldn't reactivate ${user.name}`, result);

    applyApiUser(result.data);
    router.refresh();
    notify.success(`${user.name} reactivated`, { description: 'They can sign in again with their current password.' });
  };

  const handleConfirm = async (action: UserAction) => {
    setPendingAction(null);
    const { user } = action;

    if (action.kind === 'reset') {
      const result = await resetUserCredentials(user.id);
      if (!result.ok) return failWith(`Couldn't reset ${user.name}'s password and PIN`, result);

      applyApiUser(result.data);
      router.refresh();
      notify.success(`${user.name}'s password and PIN were reset`, {
        description: "Give them the default password and PIN. They'll set their own on their next sign-in.",
      });
      return;
    }

    if (action.kind === 'deactivate') {
      const result = await deactivateUser(user.id);
      if (!result.ok) return failWith(`Couldn't deactivate ${user.name}`, result);

      applyApiUser(result.data);
      router.refresh();
      notify.undo(`${user.name} deactivated`, {
        description: "They're signed out and can't sign in. Their logs stay.",
        onUndo: () => reactivate(user),
      });
      return;
    }

    // Optimistic: the select flips at once and rolls back if FastAPI refuses
    updateUser(user.id, { role: action.role });
    const result = await changeRole({ user_id: user.id, role: action.role });
    if (!result.ok) {
      updateUser(user.id, { role: user.role });
      notify.error(`Couldn't change ${user.name}'s role`, { description: result.errors[0]?.message ?? result.message });
      return;
    }

    router.refresh();
    notify.success(`${user.name} is now ${toRoleArticle(result.data.role)} ${ROLE_LABELS[result.data.role]}`);
  };

  const handleRoleChange = (user: FarmUser, role: Role) => setPendingAction({ kind: 'role', user, role });

  // Field errors go back to the dialog to show under their inputs; anything else is a toast
  const handleInvite = async (values: InviteUserInput): Promise<FieldError[]> => {
    const result = await addUser(values);
    if (!result.ok) {
      if (result.errors.length === 0) failWith(`Couldn't add ${values.name}`, result);
      return result.errors;
    }

    // A brand-new user is never the signed-in one, so is_self is always false here
    setUsers((current) => [...current, toFarmUser(result.data, '')]);
    setIsInviteOpen(false);
    router.refresh();
    notify.success(`${result.data.name} added as ${toRoleArticle(result.data.role)} ${ROLE_LABELS[result.data.role]}`, {
      description: 'Give them the default password and PIN. They set their own on first sign-in.',
    });
    return [];
  };

  const actionHandlers = {
    onReset: (user: FarmUser) => setPendingAction({ kind: 'reset', user }),
    onDeactivate: (user: FarmUser) => setPendingAction({ kind: 'deactivate', user }),
    onReactivate: reactivate,
  };

  return (
    <div className="flex flex-col gap-8">
      <CustomPageHeader
        title="Users"
        status={
          <span>
            {countOf('active')} active · {countOf('invited')} not set up · {countOf('deactivated')} deactivated
          </span>
        }
        actions={
          <Button type="button" className="h-11 px-5" onClick={() => setIsInviteOpen(true)}>
            <UserPlus aria-hidden />
            Add user
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
                      <CustomRoleSelect user={user} canManageAdmins={canManageAdmins} onChange={(role) => handleRoleChange(user, role)} />
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
                  <CustomRoleSelect user={user} canManageAdmins={canManageAdmins} onChange={(role) => handleRoleChange(user, role)} />
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
        canManageAdmins={canManageAdmins}
        onInvite={handleInvite}
      />
      <CustomUserConfirmDialog action={pendingAction} onConfirm={handleConfirm} onCancel={() => setPendingAction(null)} />
    </div>
  );
};

export default CustomUsersBoard;
