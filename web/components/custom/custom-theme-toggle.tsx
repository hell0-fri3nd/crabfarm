'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CustomThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const handleToggle = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="outline" size="icon" className="rounded-full bg-card/60" onClick={handleToggle}>
          <Moon className="hidden size-4.5 dark:block" aria-hidden />
          <Sun className="size-4.5 dark:hidden" aria-hidden />
          <span className="sr-only dark:hidden">Switch to dark theme</span>
          <span className="sr-only hidden dark:inline">Switch to light theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" aria-hidden>
        <span className="dark:hidden">Switch to dark theme</span>
        <span className="hidden dark:inline">Switch to light theme</span>
      </TooltipContent>
    </Tooltip>
  );
};

export default CustomThemeToggle;
