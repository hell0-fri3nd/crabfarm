import { Inter, JetBrains_Mono } from 'next/font/google';

import type { Metadata } from 'next';

import CustomThemeProvider from '@/components/custom/custom-theme-provider';
import CustomToaster from '@/components/custom/custom-toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import './globals.css';

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const fontMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CrabFarm', template: '%s · CrabFarm' },
  description: 'Mud crab farm monitoring, feeding and growth tracking.',
};

const RootLayout = ({ children }: LayoutProps<'/'>) => (
  <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`} suppressHydrationWarning>
    <body className="min-h-dvh font-sans antialiased">
      <CustomThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <CustomToaster />
      </CustomThemeProvider>
    </body>
  </html>
);

export default RootLayout;
