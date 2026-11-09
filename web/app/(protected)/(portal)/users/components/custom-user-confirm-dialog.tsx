'use client';

import { KeyRound, UserCheck, UserX } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '../lib/role-meta';

import type { UserAction } from '../types/users';

type CustomUserConfirmDialogProps = {
  action: UserAction | null;
  onConfirm: (action: UserAction) => void;
  onCancel: () => void;
};

const toCopy = (action: UserAction) => {
  const { name } = action.user;

  if (action.kind === 'reset') {
    return {
      title: `Reset ${name}'s password and PIN?`,
      body: `${name} is signed out on every device and gets a temporary password. They'll set a new password and PIN on their next sign-in. Their logs and role stay.`,
      confirm: 'Reset password and PIN',
      icon: KeyRound,
      isDestructive: false,
    };
  }

  if (action.kind === 'deactivate') {
    return {
      title: `Deactivate ${name}?`,
      body: `${name} is signed out on every device and can't sign in until an admin reactivates the account. Their logs stay.`,
      confirm: 'Deactivate',
      icon: UserX,
      isDestructive: true,
    };
  }

  return {
    title: `Make ${name} ${action.role === 'admin' ? 'an' : 'a'} ${ROLE_LABELS[action.role]}?`,
    body: `${ROLE_LABELS[action.role]}: ${ROLE_DESCRIPTIONS[action.role]} The change applies the next time ${name} loads a page.`,
    confirm: `Make ${ROLE_LABELS[action.role]}`,
    icon: UserCheck,
    isDestructive: false,
  };
};

const CustomUserConfirmDialog = ({ action, onConfirm, onCancel }: CustomUserConfirmDialogProps) => {
  const copy = action ? toCopy(action) : null;
  const Icon = copy?.icon;

  return (
    <AlertDialog open={action !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={copy?.isDestructive ? 'destructive' : 'default'}
            className="h-11"
            onClick={() => action && onConfirm(action)}
          >
            {Icon && <Icon aria-hidden />}
            {copy?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CustomUserConfirmDialog;
