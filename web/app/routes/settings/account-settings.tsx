import React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router';
import {
  Check,
  CircleAlert,
  KeyRound,
  KeySquare,
  ListFilter,
  Loader2,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { REGEXP_ONLY_DIGITS } from 'input-otp';

import { getActivityLogs } from '~/api/logs';
import { getProfile, updateProfileCredentials, updateProfileName } from '~/api/profile';
import { useInitials } from '~/hooks/use-initials';
import { useMobileNavigation } from '~/hooks/user-mobile-navigations';
import { persistor, type AppDispatch } from '~/store/store';
import { accessExpired, clearAuth, logout, refreshExpired } from '~/store/auth/auth-slice';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '~/components/ui/input-otp';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import type { ActivityLogs } from '~/types/activity-logs';

const getErrorMessage = (err: unknown): string | null => {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object') {
    const detail = (err as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  if (err instanceof Error) return err.message;
  return null;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const AccountSettings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const cleanup = useMobileNavigation();
  const initials = useInitials();

  const [passwordOpen, setPasswordOpen] = React.useState(false);
  const [pinOpen, setPinOpen] = React.useState(false);
  const [activityFilter, setActivityFilter] = React.useState<string>('all');

  const { data: profile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getProfile(),
    retry: false,
  });

  const { data: logs = [], isLoading: logsLoading, error: logsError } = useQuery<ActivityLogs[]>({
    queryKey: ['activityLogs'],
    queryFn: () => getActivityLogs(),
    retry: false,
  });

  const handleAuthError = (error: unknown) => {
    const message = getErrorMessage(error);
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
    if (profileError) handleAuthError(profileError);
  }, [profileError]);

  React.useEffect(() => {
    if (logsError) handleAuthError(logsError);
  }, [logsError]);

  const ownedLogs = React.useMemo(
    () => (profile ? logs.filter((log) => log.user_id === profile.id) : []),
    [logs, profile],
  );

  const activityTypes = React.useMemo(() => {
    const set = new Set<string>();
    ownedLogs.forEach((log) => log.activity_type && set.add(log.activity_type));
    return Array.from(set).sort();
  }, [ownedLogs]);

  const filteredLogs = React.useMemo(
    () => (activityFilter === 'all' ? ownedLogs : ownedLogs.filter((l) => l.activity_type === activityFilter)),
    [ownedLogs, activityFilter],
  );

  const credentialMutation = useMutation({
    mutationFn: updateProfileCredentials,
    onSuccess: () => {
      toast.success('Credentials updated successfully', { position: 'top-right' });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err) ?? 'Failed to update credentials', { position: 'top-right' });
    },
  });

  const updateCredentials = (payload: { password?: string; pin?: string }) => {
    const entry = Object.entries(payload).find(([, v]) => v && v.trim() !== '');
    if (!entry) {
      toast.error('Please enter a value to update', { position: 'top-right' });
      return;
    }
    credentialMutation.mutate({ [entry[0]]: entry[1].trim() } as { password?: string; pin?: string });
  };

  return (
    <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 overflow-x-auto">
      {/* Page header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile, credentials, and activity.</p>
      </div>

      {/* LinkedIn-style profile card */}
      <Card className="overflow-hidden p-0">
        {/* Banner */}
        <div className="relative h-40 w-full bg-gradient-to-r from-primary/40 via-primary/25 to-primary/10 sm:h-48">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.35),transparent_60%)]" />
        </div>

        {/* Body */}
        <div className="relative px-4 pb-6 sm:px-8">
          {/* Avatar overlapping banner */}
          <div className="-mt-16 flex flex-col items-start gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {profileLoading ? (
                <Skeleton className="size-28 rounded-full ring-4 ring-background sm:size-36" />
              ) : profile ? (
                <Avatar className="size-28 rounded-full bg-background ring-4 ring-background shadow-lg sm:size-36">
                  <AvatarFallback className="rounded-full bg-muted text-3xl font-semibold text-primary sm:text-4xl">
                    {initials(profile.name) || <UserRound className="size-12" />}
                  </AvatarFallback>
                </Avatar>
              ) : null}
            </div>

            {/* Action buttons */}
            {profile ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPasswordOpen(true)}>
                  <KeyRound className="size-4" />
                  Update Password
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setPinOpen(true)}>
                  <KeySquare className="size-4" />
                  Update PIN
                </Button>
              </div>
            ) : null}
          </div>

          {/* Identity */}
          <div className="mt-4 flex flex-col gap-3">
            {profileLoading ? (
              <>
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-5 w-24" />
              </>
            ) : profile ? (
              <>
                <EditableName
                  initialName={profile.name}
                  onSaved={(name) => toast.success(`Profile updated to "${name}"`, { position: 'top-right' })}
                />
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  {profile.email}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary"
                  >
                    <ShieldCheck className="size-3.5" />
                    {profile.role}
                  </Badge>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Activity logs */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>My Activity</CardTitle>
            <CardDescription>Logs recorded on your account.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ListFilter className="size-4 text-muted-foreground" />
            <Select value={activityFilter} onValueChange={setActivityFilter}>
              <SelectTrigger size="sm" className="w-[180px]">
                <SelectValue placeholder="Filter by activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All activities</SelectItem>
                {activityTypes.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <CircleAlert className="size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-foreground">
                {ownedLogs.length === 0 ? 'No activity yet' : 'No matching activities'}
              </p>
              <p className="text-sm text-muted-foreground">
                {ownedLogs.length === 0
                  ? 'Your action history will appear here.'
                  : 'Try selecting a different activity type.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="max-h-[calc(2.75rem*7+2.5rem)] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-16">ID</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className="h-11">
                        <TableCell className="font-medium text-muted-foreground">{log.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {log.activity_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[420px] truncate">{log.description}</TableCell>
                        <TableCell>{log.value != null ? Number(log.value).toFixed(2) : '—'}</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatDate(log.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
                <span>
                  Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
                  {activityFilter !== 'all' ? ` of type "${activityFilter}"` : ''}
                </span>
                {filteredLogs.length > 7 ? <span>Scroll for more</span> : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password reset dialog */}
      <CredentialDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        title="Update Password"
        description="Enter a new password for your account."
        fieldId="account-password"
        fieldLabel="New password"
        onSubmit={(value) => updateCredentials({ password: value })}
      />

      {/* PIN reset dialog */}
      <CredentialDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        title="Update PIN"
        description="Enter a new PIN used to unlock the app."
        fieldId="account-pin"
        fieldLabel="New PIN"
        pin
        onSubmit={(value) => updateCredentials({ pin: value })}
      />
    </div>
  );
};

interface EditableNameProps {
  initialName: string;
  onSaved: (name: string) => void;
}

const EditableName = ({ initialName, onSaved }: EditableNameProps) => {
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState(initialName);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (trimmed === initialName) {
      setEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileName(trimmed);
      onSaved(trimmed);
      setEditing(false);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err) ?? 'Failed to update name', { position: 'top-right' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{initialName}</h2>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => setEditing(true)}
          aria-label="Edit name"
        >
          <Pencil className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        id="edit-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setName(initialName);
            setEditing(false);
          }
        }}
        autoFocus
        className="max-w-sm text-base font-medium"
      />
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={() => {
            setName(initialName);
            setEditing(false);
          }}
        >
          <X className="size-4" />
          Cancel
        </Button>
      </div>
    </div>
  );
};

interface CredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fieldId: string;
  fieldLabel: string;
  pin?: boolean;
  onSubmit: (value: string) => void;
}

const CredentialDialog = ({
  open,
  onOpenChange,
  title,
  description,
  fieldId,
  fieldLabel,
  pin = false,
  onSubmit,
}: CredentialDialogProps) => {
  const [value, setValue] = React.useState('');

  const close = () => {
    setValue('');
    onOpenChange(false);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    close();
  };

  const isComplete = pin ? value.length === 4 : value.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor={fieldId}>{fieldLabel}</Label>
          {pin ? (
            <div className="flex justify-center py-2">
              <InputOTP
                maxLength={4}
                pattern={REGEXP_ONLY_DIGITS}
                value={value}
                onChange={setValue}
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-14 w-14 text-xl" />
                  <InputOTPSlot index={1} className="h-14 w-14 text-xl" />
                  <InputOTPSlot index={2} className="h-14 w-14 text-xl" />
                  <InputOTPSlot index={3} className="h-14 w-14 text-xl" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          ) : (
            <Input
              id={fieldId}
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              autoFocus
            />
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="button" className="gap-1.5" disabled={!isComplete} onClick={submit}>
            <Check className="size-4" />
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettings;
