// src/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // optional, prevents auto refetch on tab focus
      retry: false,                // since token errors are handled manually
    },
  },
});
