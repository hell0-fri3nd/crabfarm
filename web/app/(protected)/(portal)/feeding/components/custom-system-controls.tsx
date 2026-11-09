'use client';

import { useState } from 'react';
import { Pause, Play, Square } from 'lucide-react';

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
import { Button } from '@/components/ui/button';

import type { SystemState } from '../types/feeding';

type CustomSystemControlsProps = {
  state: SystemState;
  nextFeedLabel: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRestart: () => void;
};

const CustomSystemControls = ({ state, nextFeedLabel, onPause, onResume, onStop, onRestart }: CustomSystemControlsProps) => {
  const [isStopOpen, setIsStopOpen] = useState(false);

  if (state === 'stopped') {
    return (
      <Button type="button" className="h-11 px-5" onClick={onRestart}>
        <Play aria-hidden />
        Restart feeding
      </Button>
    );
  }

  return (
    <>
      {state === 'running' ? (
        <Button type="button" variant="outline" className="h-11 bg-card/60 px-5" onClick={onPause}>
          <Pause aria-hidden />
          Pause
        </Button>
      ) : (
        <Button type="button" variant="outline" className="h-11 bg-card/60 px-5" onClick={onResume}>
          <Play aria-hidden />
          Resume
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        className="h-11 border-destructive/50 bg-card/60 px-5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setIsStopOpen(true)}
      >
        <Square aria-hidden />
        Stop
      </Button>

      <AlertDialog open={isStopOpen} onOpenChange={setIsStopOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop the feeding system?</AlertDialogTitle>
            <AlertDialogDescription>
              No cage is fed until you restart, including the {nextFeedLabel} feed. Feed now is turned off too. Food
              already dispensed and the schedules stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" className="h-11" onClick={onStop}>
              <Square aria-hidden />
              Stop system
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomSystemControls;
