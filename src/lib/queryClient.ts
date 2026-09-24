// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api/errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Retry transient failures only; 4xx answers are final
      retry: (failureCount, error) =>
        failureCount < 1 && (!isApiError(error) || error.status === 0 || error.status >= 500),
    },
    mutations: {
      // Money actions are never retried automatically (08-ux §3.2)
      retry: false,
    },
  },
});
