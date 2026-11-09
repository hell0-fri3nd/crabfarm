'use client';

import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert, X } from 'lucide-react';

import { Toaster } from '@/components/ui/sonner';
import { useIsMobile } from '@/hooks/use-mobile';

const TOAST_ICONS = {
  success: <CircleCheck className="size-4.5 text-primary" aria-hidden />,
  info: <Info className="size-4.5 text-info" aria-hidden />,
  warning: <TriangleAlert className="size-4.5 text-warning" aria-hidden />,
  error: <CircleX className="size-4.5 text-destructive" aria-hidden />,
  loading: <LoaderCircle className="size-4.5 animate-spin text-muted-foreground" aria-hidden />,
  close: <X className="size-3.5" aria-hidden />,
};

const TOAST_CLASS_NAMES = {
  toast: 'relative flex w-full items-start gap-3 rounded-xl border border-border bg-muted p-4 text-foreground shadow-lg',
  icon: 'mt-px flex shrink-0',
  content: 'flex min-w-0 flex-1 flex-col gap-1',
  title: 'text-sm font-semibold',
  description: 'text-sm text-muted-foreground',
  actionButton:
    'h-8 shrink-0 cursor-pointer self-center rounded-md border border-border bg-card px-3 text-sm font-medium outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50',
  closeButton:
    'absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
};

const CustomToaster = () => {
  const isMobile = useIsMobile();

  return (
    <Toaster
      position={isMobile ? 'top-center' : 'bottom-right'}
      visibleToasts={3}
      icons={TOAST_ICONS}
      toastOptions={{ unstyled: true, classNames: TOAST_CLASS_NAMES }}
    />
  );
};

export default CustomToaster;
