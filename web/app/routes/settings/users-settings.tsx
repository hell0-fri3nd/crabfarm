import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import {
  KeyRound,
  KeySquare,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShieldOff,
  UserRound,
  UserRoundPlus,
} from 'lucide-react';
import { toast } from 'sonner';

import { createUser, deleteUser, getUsers, resetUserCredentials } from '~/api/users';
import { useInitials } from '~/hooks/use-initials';
import { useMobileNavigation } from '~/hooks/user-mobile-navigations';
import { persistor, type AppDispatch } from '~/store/store';
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Skeleton } from '~/components/ui/skeleton';
import type { ManagedUser } from '~/types/users';

const DEFAULT_PASSWORD = 'hellofriend';
const DEFAULT_PIN = '1234';

const AUTH_ERRORS = ['MISSING_ACCESS_TOKEN', 'EXPIRED_ACCESS_TOKEN', 'MISSING_REFRESH_TOKEN', 'EXPIRED_REFRESH_TOKEN'];

const UsersSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cleanup = useMobileNavigation();
  const initials = useInitials();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [selectedUser, setSelectedUser] = React.useState<ManagedUser | null>(null);
  const [resetUser, setResetUser] = React.useState<ManagedUser | null>(null);
  const [deactivateUser, setDeactivateUser] = React.useState<ManagedUser | null>(null);
  const [addOpen, setAddOpen] = React.useState(false);

  const { data: users = [], isLoading, error } = useQuery<ManagedUser[]>({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully', { position: 'top-right' });
      setAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.detail ?? err ?? 'Failed to create user', { position: 'top-right' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ user_id, ...payload }: { user_id: number; reset_password: boolean; reset_pin: boolean }) =>
      resetUserCredentials(user_id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User credentials reset successfully', { position: 'top-right' });
      setResetUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to reset credentials', { position: 'top-right' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deactivated successfully', { position: 'top-right' });
      setDeactivateUser(null);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? 'Failed to deactivate user', { position: 'top-right' });
    },
  });

  const handleAuthError = (err: unknown) => {
    const errStr = (err as unknown as any)?.message ?? err;
    const message = typeof errStr === 'string' ? errStr : String(errStr);

    if (message === 'MISSING_ACCESS_TOKEN' || message === 'EXPIRED_ACCESS_TOKEN') {
      dispatch(accessExpired());
      navigate('/access-token');
    }
    if (message === 'MISSING_REFRESH_TOKEN' || message === 'EXPIRED_REFRESH_TOKEN') {
      dispatch(accessExpired());
      dispatch(refreshExpired());
      dispatch(clearAuth());
      cleanup();
      dispatch(logout());
      persistor.purge();
      navigate('/auth');
    }
  };

  React.useEffect(() => {
    if (!error) return;
    handleAuthError(error);
  }, [error]);

  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 overflow-x-auto">
      <div className="border-b border-border/40 py-5">
        <div className="max-w-7xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">User Management</h1>
            <p className="text-muted-foreground">Add, reset, and deactivate user accounts</p>
          </div>
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <UserRoundPlus className="size-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 px-1">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="ps-9"
          />
        </div>
        <Badge variant="secondary" className="ms-auto">
          {filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>
          ))}

        {!isLoading &&
          filteredUsers.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => setSelectedUser(user)}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card p-4 text-start shadow-xs transition-colors hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {initials(user.name) || <UserRound className="size-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Reset ${user.name}'s credentials`}
                  className="opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResetUser(user);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Deactivate ${user.name}`}
                  className="text-destructive opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeactivateUser(user);
                  }}
                >
                  <ShieldOff className="size-4" />
                </Button>
              </div>
            </button>
          ))}

        {!isLoading && filteredUsers.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 py-16 text-center">
            <UserRound className="size-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No users found</p>
            <p className="text-sm text-muted-foreground">
              {users.length === 0 ? 'Add your first user to get started.' : 'Try adjusting your search.'}
            </p>
          </div>
        )}
      </div>

      {/* User detail */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent showCloseButton={false} className="overflow-hidden p-0 sm:max-w-lg">
          {selectedUser && (
            <>
              {/* Banner */}
              <div className="relative h-28 w-full bg-gradient-to-r from-primary/40 via-primary/25 to-primary/10 sm:h-32">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
              </div>

              {/* Body */}
              <div className="relative px-6 pb-6">
                <div className="-mt-12 flex items-end gap-4 sm:-mt-14">
                  <Avatar className="size-24 rounded-full bg-background ring-4 ring-background shadow-lg sm:size-28">
                    <AvatarFallback className="rounded-full bg-muted text-2xl font-semibold text-primary sm:text-3xl">
                      {initials(selectedUser.name) || <UserRound className="size-10" />}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <DialogHeader className="mt-4 gap-2 text-start">
                  <DialogTitle className="text-2xl font-bold tracking-tight">
                    {selectedUser.name}
                  </DialogTitle>
                  <DialogDescription asChild>
                    <div className="flex flex-col gap-2">
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="size-4" />
                        {selectedUser.email}
                      </span>
                      {selectedUser.role ? (
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary"
                          >
                            <ShieldCheck className="size-3.5" />
                            {selectedUser.role}
                          </Badge>
                        </span>
                      ) : null}
                    </div>
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter className="mt-6 flex flex-wrap items-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedUser(null);
                      setResetUser(selectedUser);
                    }}
                  >
                    <KeyRound className="size-4" />
                    Reset Credentials
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedUser(null);
                      setDeactivateUser(selectedUser);
                    }}
                  >
                    <ShieldOff className="size-4" />
                    Deactivate
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add user */}
      <AddUserDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSubmit={(data) => createMutation.mutate(data)}
        isPending={createMutation.isPending}
      />

      {/* Reset credentials */}
      <ResetCredentialsDialog
        user={resetUser}
        onOpenChange={(open) => !open && setResetUser(null)}
        onConfirm={({ reset_password, reset_pin }) =>
          resetUser &&
          resetMutation.mutate({
            user_id: resetUser.id,
            reset_password,
            reset_pin,
          })
        }
        isPending={resetMutation.isPending}
      />

      {/* Deactivate confirm */}
      <AlertDialog open={!!deactivateUser} onOpenChange={(open) => !open && setDeactivateUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <ShieldOff className="size-8 text-destructive" />
            </AlertDialogMedia>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              Deactivate <span className="font-semibold text-foreground">{deactivateUser?.name}</span> (
              {deactivateUser?.email})? This will permanently remove their account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deactivateUser && deleteMutation.mutate(deactivateUser.id)}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ShieldOff className="size-4" />
              )}
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; email: string }) => void;
  isPending: boolean;
}

const AddUserDialog = ({ open, onOpenChange, onSubmit, isPending }: AddUserDialogProps) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setErrorMessage('Name and email are required.');
      return;
    }
    setErrorMessage('');
    onSubmit({ name: name.trim(), email: email.trim() });
    resetForm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a new user account. The password is set to a default value on the first sign-in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="new-user-name">Name</Label>
            <Input
              id="new-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-user-email">Email</Label>
            <Input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              required
            />
          </div>
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <UserRoundPlus className="size-4" />}
              Add User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

interface ResetCredentialsDialogProps {
  user: ManagedUser | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { reset_password: boolean; reset_pin: boolean }) => void;
  isPending: boolean;
}

const ResetCredentialsDialog = ({ user, onOpenChange, onConfirm, isPending }: ResetCredentialsDialogProps) => {
  const [resetPassword, setResetPassword] = React.useState(true);
  const [resetPin, setResetPin] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setResetPassword(true);
      setResetPin(false);
    }
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && onOpenChange(false)}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reset Credentials</DialogTitle>
          <DialogDescription>
            Choose credentials to reset for <span className="font-medium text-foreground">{user.name}</span>. Reset
            values restore per-account defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setResetPassword((v) => !v)}
            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              resetPassword ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-accent/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-9 items-center justify-center rounded-full ${resetPassword ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <KeyRound className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Reset password</span>
                <span className="text-xs text-muted-foreground">Default: {DEFAULT_PASSWORD}</span>
              </div>
            </div>
            <Badge variant={resetPassword ? 'default' : 'outline'}>
              {resetPassword ? 'Will reset' : 'Keep'}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setResetPin((v) => !v)}
            className={`flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              resetPin ? 'border-primary bg-primary/5' : 'border-border/60 hover:bg-accent/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex size-9 items-center justify-center rounded-full ${resetPin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <KeySquare className="size-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">Reset PIN</span>
                <span className="text-xs text-muted-foreground">Default: {DEFAULT_PIN}</span>
              </div>
            </div>
            <Badge variant={resetPin ? 'default' : 'outline'}>
              {resetPin ? 'Will reset' : 'Keep'}
            </Badge>
          </button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            disabled={isPending || (!resetPassword && !resetPin)}
            onClick={() => onConfirm({ reset_password: resetPassword, reset_pin: resetPin })}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UsersSettings;