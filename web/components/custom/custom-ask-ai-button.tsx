import Link from 'next/link';
import { Bot } from 'lucide-react';

import { Button } from '@/components/ui/button';

const CustomAskAiButton = () => (
  <Button
    asChild
    className="rounded-full border border-transparent bg-foreground px-4 text-background hover:bg-foreground/90 hover:ring-[3px] hover:ring-primary/30 dark:border-primary/40 dark:bg-card dark:text-foreground dark:hover:bg-card"
  >
    <Link href="/assistant">
      <Bot aria-hidden />
      Ask AI
    </Link>
  </Button>
);

export default CustomAskAiButton;
