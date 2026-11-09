'use client';

import { useState } from 'react';
import { CircleCheck } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

import type { ActionProposal } from '../types/assistant';

type CustomActionProposalProps = {
  proposal: ActionProposal;
};

const SIMULATED_DEVICE_MS = 900;

type ProposalState = 'open' | 'dismissed' | 'done';

const CustomActionProposal = ({ proposal }: CustomActionProposalProps) => {
  const [state, setState] = useState<ProposalState>('open');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    await new Promise((resolve) => window.setTimeout(resolve, SIMULATED_DEVICE_MS));
    setIsPending(false);
    setIsDialogOpen(false);
    setState('done');
    notify.success(proposal.success_title, { description: 'Logged in Activity, tagged Assistant.' });
  };

  if (state === 'dismissed') {
    return <p className="text-sm text-muted-foreground">Suggestion dismissed. Nothing was changed.</p>;
  }

  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 text-sm font-medium text-primary">
        <CircleCheck className="size-4" aria-hidden />
        {proposal.success_title}. Logged under your name.
      </p>
    );
  }

  return (
    <section
      aria-label="Suggested action"
      className="flex max-w-xl flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium text-muted-foreground">Suggested action</p>
        <p className="text-base font-semibold md:text-sm">{proposal.title}</p>
        <p className="text-sm text-muted-foreground">{proposal.detail}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <AlertDialog open={isDialogOpen} onOpenChange={(isOpen) => !isPending && setIsDialogOpen(isOpen)}>
          <Button type="button" className="h-11 w-full sm:w-auto md:h-9" onClick={() => setIsDialogOpen(true)}>
            {proposal.confirm_label}
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{proposal.confirm_title}</AlertDialogTitle>
              <AlertDialogDescription>{proposal.confirm_body}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button type="button" onClick={handleConfirm} disabled={isPending} className="min-w-32">
                {isPending ? proposal.pending_label : proposal.confirm_label}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" variant="ghost" className="h-11 w-full sm:w-auto md:h-9" onClick={() => setState('dismissed')}>
          Not now
        </Button>
      </div>
    </section>
  );
};

export default CustomActionProposal;
