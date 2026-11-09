'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import CustomCardHeading from '@/components/custom/custom-card-heading';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { themeOptionSchema } from '../types/profile';

const THEME_CHOICES = { light: { label: 'Light', Icon: Sun }, dark: { label: 'Dark', Icon: Moon } } as const;

const ITEM_CLASS = 'h-11 flex-1 px-4 data-[state=on]:bg-accent data-[state=on]:font-semibold sm:flex-none';

const CustomPreferencesCard = () => {
  const { resolvedTheme, setTheme } = useTheme();

  const handleThemeChange = (value: string) => {
    const parsed = themeOptionSchema.safeParse(value);
    if (parsed.success) setTheme(parsed.data);
  };

  return (
    <Card className="gap-5 rounded-2xl py-5 sm:py-6">
      <CustomCardHeading title="Theme" description="Light for daytime outdoors, dark for the office." />
      <CardContent className="px-4 sm:px-6">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Theme"
          value={resolvedTheme}
          onValueChange={handleThemeChange}
          className="w-full bg-card sm:w-fit"
        >
          {themeOptionSchema.options.map((option) => {
            const { label, Icon } = THEME_CHOICES[option];
            return (
              <ToggleGroupItem key={option} value={option} className={ITEM_CLASS}>
                <Icon aria-hidden />
                {label}
              </ToggleGroupItem>
            );
          })}
        </ToggleGroup>
      </CardContent>
    </Card>
  );
};

export default CustomPreferencesCard;
