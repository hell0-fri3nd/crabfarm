'use client';

import { ThemeProvider } from 'next-themes';

import type { ReactNode } from 'react';

type CustomThemeProviderProps = {
  children: ReactNode;
};

const CustomThemeProvider = ({ children }: CustomThemeProviderProps) => (
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
    {children}
  </ThemeProvider>
);

export default CustomThemeProvider;
