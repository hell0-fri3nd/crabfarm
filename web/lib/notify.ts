import { toast } from 'sonner';

type NotifyOptions = {
  description?: string;
};

type UndoOptions = NotifyOptions & {
  onUndo: () => void;
};

export const TOAST_DURATION_MS = {
  success: 5000,
  info: 5000,
  warning: 8000,
  undo: 6000,
} as const;

export const notify = {
  success: (title: string, options: NotifyOptions = {}) =>
    toast.success(title, { ...options, duration: TOAST_DURATION_MS.success }),

  info: (title: string, options: NotifyOptions = {}) =>
    toast.info(title, { ...options, duration: TOAST_DURATION_MS.info }),

  warning: (title: string, options: NotifyOptions = {}) =>
    toast.warning(title, { ...options, duration: TOAST_DURATION_MS.warning }),

  error: (title: string, options: NotifyOptions = {}) =>
    toast.error(title, { ...options, duration: Infinity, closeButton: true }),

  undo: (title: string, { onUndo, ...options }: UndoOptions) =>
    toast.success(title, {
      ...options,
      duration: TOAST_DURATION_MS.undo,
      action: { label: 'Undo', onClick: onUndo },
    }),
};
