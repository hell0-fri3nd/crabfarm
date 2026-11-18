'use client';

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

import type { FeedTarget } from '../types/feeding';

type CustomFeedConfirmDialogProps = {
  target: FeedTarget | null;
  cageNames: string[];
  onConfirm: () => void;
  onCancel: () => void;
};

const toList = (names: string[]) =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;

const CustomFeedConfirmDialog = ({ target, cageNames, onConfirm, onCancel }: CustomFeedConfirmDialogProps) => (
  <AlertDialog open={target !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Feed {target?.label} now?</AlertDialogTitle>
        <AlertDialogDescription>
          This drops one portion into {cageNames.length === 1 ? 'cage' : 'cages'} {toList(cageNames)} right away. It
          can&apos;t be undone, and it doesn&apos;t change the schedules.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
        <AlertDialogAction className="h-11" onClick={onConfirm}>
          Feed {target?.label}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default CustomFeedConfirmDialog;
