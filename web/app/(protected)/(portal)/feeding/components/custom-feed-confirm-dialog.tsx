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
  cageCodes: string[];
  skippedNote: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

const toList = (codes: string[]) =>
  codes.length <= 1 ? (codes[0] ?? '') : `${codes.slice(0, -1).join(', ')} and ${codes.at(-1) ?? ''}`;

const CustomFeedConfirmDialog = ({ target, cageCodes, skippedNote, onConfirm, onCancel }: CustomFeedConfirmDialogProps) => (
  <AlertDialog open={target !== null} onOpenChange={(isOpen) => !isOpen && onCancel()}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Feed {target?.label} now?</AlertDialogTitle>
        <AlertDialogDescription>
          This drops one portion into {cageCodes.length === 1 ? 'cage' : 'cages'} {toList(cageCodes)} right away. It
          can&apos;t be undone, and it doesn&apos;t change the schedules.
          {skippedNote && <span className="mt-2 block">{skippedNote}</span>}
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
