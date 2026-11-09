'use client';

import Link from 'next/link';
import { KeyRound, Pencil, Send, UserCheck, UserX } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { FarmUser } from '../types/users';

type CustomUserActionsProps = {
  user: FarmUser;
  onReset: (user: FarmUser) => void;
  onResendInvite: (user: FarmUser) => void;
  onDeactivate: (user: FarmUser) => void;
  onReactivate: (user: FarmUser) => void;
  className?: string;
};

const DESTRUCTIVE_OUTLINE =
  'border-destructive/50 bg-card/60 text-destructive hover:bg-destructive/10 hover:text-destructive';

const CustomUserActions = ({ user, onReset, onResendInvite, onDeactivate, onReactivate, className }: CustomUserActionsProps) => {
  if (user.is_self) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 sm:justify-end', className)}>
        <Button asChild variant="ghost" className="h-11">
          <Link href="/profile">
            <Pencil aria-hidden />
            Edit my profile
          </Link>
        </Button>
      </div>
    );
  }

  if (user.status === 'deactivated') {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 sm:justify-end', className)}>
        <Button type="button" variant="outline" className="h-11 bg-card/60" onClick={() => onReactivate(user)}>
          <UserCheck aria-hidden />
          Reactivate
          <span className="sr-only">{user.name}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 sm:justify-end', className)}>
      {user.status === 'invited' ? (
        <Button type="button" variant="ghost" className="h-11" onClick={() => onResendInvite(user)}>
          <Send aria-hidden />
          Resend invite
          <span className="sr-only">to {user.name}</span>
        </Button>
      ) : (
        <Button type="button" variant="ghost" className="h-11" onClick={() => onReset(user)}>
          <KeyRound aria-hidden />
          Reset
          <span className="sr-only">password and PIN for {user.name}</span>
        </Button>
      )}
      <Button type="button" variant="outline" className={cn('h-11', DESTRUCTIVE_OUTLINE)} onClick={() => onDeactivate(user)}>
        <UserX aria-hidden />
        Deactivate
        <span className="sr-only">{user.name}</span>
      </Button>
    </div>
  );
};

export default CustomUserActions;
