'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import CustomStepActions from './custom-step-actions';
import { THEME_OPTIONS, lookStepSchema } from '../types/onboarding';

import type { LookStepInput } from '../types/onboarding';

type CustomLookStepProps = {
  onBack: () => void;
  onComplete: (values: LookStepInput) => void;
};

const THEME_CHOICES = {
  light: { label: 'Light', hint: 'Daytime, outdoors', Icon: Sun },
  dark: { label: 'Dark', hint: 'Office, night shift', Icon: Moon },
} as const satisfies Record<LookStepInput['theme'], unknown>;

const isThemeOption = (value: string): value is LookStepInput['theme'] =>
  THEME_OPTIONS.some((option) => option === value);

const CustomLookStep = ({ onBack, onComplete }: CustomLookStepProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const form = useForm<LookStepInput>({
    resolver: zodResolver(lookStepSchema),
    defaultValues: { theme: resolvedTheme === 'light' ? 'light' : 'dark' },
  });

  return (
    <section aria-labelledby="look-step-title">
      <h1 id="look-step-title" className="text-3xl font-bold">Pick your look</h1>
      <p className="mt-1 text-sm text-muted-foreground">You can change this any time from your profile.</p>

      <form noValidate onSubmit={form.handleSubmit(onComplete)} className="mt-6">
        <FieldGroup className="gap-6">
          <Controller
            name="theme"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel id="theme-label">Theme</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={3}
                  aria-labelledby="theme-label"
                  value={field.value}
                  onValueChange={(value) => {
                    if (!isThemeOption(value)) return;
                    field.onChange(value);
                    setTheme(value);
                  }}
                  className="grid w-full grid-cols-2 gap-3"
                >
                  {THEME_OPTIONS.map((option) => {
                    const { label, hint, Icon } = THEME_CHOICES[option];
                    return (
                      <ToggleGroupItem
                        key={option}
                        value={option}
                        className="group/theme relative h-auto min-h-18 flex-col items-start gap-1 rounded-xl border-border bg-card px-4 py-3 text-left shadow-none hover:bg-accent data-[state=on]:border-primary data-[state=on]:bg-primary/10"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <Icon className="size-4" aria-hidden />
                          {label}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">{hint}</span>
                        <Check
                          className="absolute top-3 right-3 hidden size-4 text-primary group-data-[state=on]/theme:block"
                          aria-hidden
                        />
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
                <FieldDescription>The page switches as you choose.</FieldDescription>
              </Field>
            )}
          />

          <CustomStepActions
            submitLabel="Finish"
            pendingLabel="Finishing…"
            isPending={form.formState.isSubmitting}
            onBack={onBack}
          />
        </FieldGroup>
      </form>
    </section>
  );
};

export default CustomLookStep;
