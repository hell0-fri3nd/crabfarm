'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type CustomSearchInputProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

const CustomSearchInput = ({ id, label, placeholder, value, onChange, className }: CustomSearchInputProps) => {
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(value);
  }

  const handleChange = (next: string) => {
    setDraft(next);
    setSyncedValue(next.trim());
    onChange(next.trim());
  };

  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id={id}
        type="search"
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="h-11 bg-card pl-10"
      />
    </div>
  );
};

export default CustomSearchInput;
