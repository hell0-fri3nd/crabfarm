import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { logsSearchParamsSchema } from '../types/logs';

import type { LogsParamKey } from '../types/logs';

export type ParamUpdates = Partial<Record<LogsParamKey, string | null>>;

export const useLogsSearchParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const params = logsSearchParamsSchema.parse(Object.fromEntries(searchParams));

  const setParams = (updates: ParamUpdates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!('page' in updates)) next.delete('page');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return { params, setParams };
};
