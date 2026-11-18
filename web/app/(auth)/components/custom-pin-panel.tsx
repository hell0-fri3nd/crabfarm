import { signOut } from '@/app/(protected)/(portal)/profile/actions/sign-out';
import { Button } from '@/components/ui/button';
import { getSignedInName } from '@/lib/session';

import CustomPinForm from './custom-pin-form';
import { pinSearchParamsSchema } from '../types/auth';

type CustomPinPanelProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const FALLBACK_NAME = 'Welcome back';

const CustomPinPanel = async ({ searchParams }: CustomPinPanelProps) => {
  const name = await getSignedInName();
  const { next: returnTo } = pinSearchParamsSchema.parse(await searchParams);

  return (
    <div className="flex w-full max-w-100 flex-col items-center">
      <CustomPinForm name={name ?? FALLBACK_NAME} returnTo={returnTo} />
      <form action={signOut} className="mt-6">
        <Button type="submit" variant="link" className="h-11 text-muted-foreground">
          Not you? Sign out
        </Button>
      </form>
    </div>
  );
};

export default CustomPinPanel;
