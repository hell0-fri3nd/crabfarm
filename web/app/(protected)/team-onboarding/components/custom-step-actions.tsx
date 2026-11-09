import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

type CustomStepActionsProps = {
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onBack?: () => void;
};

const CustomStepActions = ({ submitLabel, pendingLabel, isPending, onBack }: CustomStepActionsProps) => (
  <div className="mt-2 flex items-center justify-between gap-4">
    <Button
      type="button"
      variant="ghost"
      className="h-11 text-muted-foreground"
      onClick={onBack}
      disabled={!onBack || isPending}
    >
      <ArrowLeft aria-hidden />
      Back
    </Button>
    <Button type="submit" className="h-11 min-w-26 px-5" disabled={isPending}>
      {isPending ? pendingLabel : submitLabel}
    </Button>
  </div>
);

export default CustomStepActions;
