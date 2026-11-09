import Link from 'next/link';
import { Bot, CalendarClock, ChartLine } from 'lucide-react';

import { Button } from '@/components/ui/button';

import CustomGreeting from './custom-greeting';

type CustomBriefingProps = {
  firstName: string;
  summary: string;
};

const CustomBriefing = ({ firstName, summary }: CustomBriefingProps) => (
  <section aria-label="Tonight's briefing" className="flex flex-col gap-4">
    <CustomGreeting firstName={firstName} />
    <p className="max-w-prose text-base leading-relaxed sm:text-lg">{summary}</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Button asChild className="h-11 w-full px-5 sm:w-auto">
        <Link href="#sensor-trends">
          <ChartLine aria-hidden />
          See ammonia trend
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-11 w-full bg-card/60 px-5 sm:w-auto">
        <Link href="/feeding">
          <CalendarClock aria-hidden />
          Check C4 and E2
        </Link>
      </Button>
      <Button asChild variant="ghost" className="h-11 w-full px-4 text-muted-foreground sm:w-auto">
        <Link href="/assistant">
          <Bot aria-hidden />
          Ask what to do
        </Link>
      </Button>
    </div>
  </section>
);

export default CustomBriefing;
