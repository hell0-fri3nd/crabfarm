'use client';

import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type CustomPasswordInputProps = Omit<ComponentProps<typeof Input>, 'type'> & {
  hasLockIcon?: boolean;
};

const CustomPasswordInput = ({ hasLockIcon = false, className, ...props }: CustomPasswordInputProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleToggleVisibility = () => setIsVisible((current) => !current);

  return (
    <div className="relative">
      {hasLockIcon && (
        <Lock
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      )}
      <Input
        {...props}
        type={isVisible ? 'text' : 'password'}
        className={cn('h-11 bg-card pr-12', hasLockIcon && 'pl-10', className)}
      />
      <button
        type="button"
        onClick={handleToggleVisibility}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        aria-pressed={isVisible}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
      >
        {isVisible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
};

export default CustomPasswordInput;
