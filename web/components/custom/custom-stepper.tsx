import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Step = {
  id: string;
  title: string;
  description: string;
};

type CustomStepperProps = {
  steps: Step[];
  currentIndex: number;
  label: string;
};

const CustomStepper = ({ steps, currentIndex, label }: CustomStepperProps) => (
  <nav aria-label={label}>
    <p className="mb-3 text-sm text-muted-foreground sm:sr-only">
      Step {currentIndex + 1} of {steps.length}
    </p>
    <ol className="grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map(({ id, title, description }, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <li key={id} aria-current={isCurrent ? 'step' : undefined} className="relative">
            <div className="flex items-center">
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  isDone && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary text-primary ring-4 ring-primary/20',
                  !isDone && !isCurrent && 'border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" aria-hidden /> : index + 1}
              </span>
              {!isLast && (
                <span
                  aria-hidden
                  className={cn('mx-2 h-px flex-1', isDone ? 'bg-primary' : 'bg-border')}
                />
              )}
            </div>
            <p className={cn('mt-3 text-sm font-semibold', !isCurrent && !isDone && 'text-muted-foreground')}>
              {title}
              <span className="sr-only">{isDone ? ' (done)' : ''}</span>
            </p>
            <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{description}</p>
          </li>
        );
      })}
    </ol>
  </nav>
);

export default CustomStepper;
