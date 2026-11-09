import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import type { Metadata } from 'next';

import CustomAuthShell from '@/components/custom/custom-auth-shell';
import CustomFooter from '@/components/custom/custom-footer';
import CustomThemeToggle from '@/components/custom/custom-theme-toggle';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Page not found' };

const NotFound = () => (
  <CustomAuthShell headerEnd={<CustomThemeToggle />}>
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex max-w-md flex-col items-start gap-4">
        <h1 className="text-3xl font-bold">This page isn&apos;t here</h1>
        <p className="text-muted-foreground">
          The link may be old, or this part of CrabFarm isn&apos;t built yet. Your readings and schedules are fine.
        </p>
        <Button asChild className="h-11 px-5">
          <Link href="/dashboard">
            <ArrowLeft aria-hidden />
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </main>
    <CustomFooter />
  </CustomAuthShell>
);

export default NotFound;
