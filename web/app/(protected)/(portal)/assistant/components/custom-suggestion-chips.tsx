import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CustomSuggestionChipsProps = {
  questions: readonly string[];
  isDisabled: boolean;
  onPick: (question: string) => void;
  className?: string;
};

const CustomSuggestionChips = ({ questions, isDisabled, onPick, className }: CustomSuggestionChipsProps) => (
  <ul aria-label="Suggested questions" className={cn('flex gap-2', className)}>
    {questions.map((question) => (
      <li key={question} className="shrink-0">
        <Button
          type="button"
          variant="outline"
          disabled={isDisabled}
          onClick={() => onPick(question)}
          className="h-11 rounded-full bg-card/60 px-4 font-medium md:h-9 md:px-3.5"
        >
          {question}
        </Button>
      </li>
    ))}
  </ul>
);

export default CustomSuggestionChips;
