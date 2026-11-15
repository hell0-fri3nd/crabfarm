'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { signOut } from '@/actions/sign-out';

const CustomSignOutButton = () => {
  const [isSigningOut, startSignOut] = useTransition();

  const handleSignOut = () => startSignOut(signOut);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-11 border-destructive/60 bg-destructive/10 px-4 font-semibold text-destructive hover:bg-destructive/15 hover:text-destructive dark:border-destructive/60 dark:bg-destructive/15 dark:hover:bg-destructive/25"
        >
          <LogOut aria-hidden />
          Sign out
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sign out of CrabFarm?</AlertDialogTitle>
          <AlertDialogDescription>
            You&apos;ll need your email and password to sign in again on this device. Feeding schedules keep running.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isSigningOut} onClick={handleSignOut}>
            <LogOut aria-hidden />
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CustomSignOutButton;
