// src/features/auth/session.ts
// Login / logout actions shared by LoginPage, SignupPage and the session-expired sheet

import { useMutation } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api';
import { useSessionStore } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queries';
import { usePendingActionStore } from '@/lib/pendingAction';
import { LoginRequest } from '@/lib/types';
import { t } from '@/i18n';

export const useLogin = () =>
  useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const result = await api.login(credentials);
      useSessionStore.getState().signedIn(result.access_token, result.refresh_token);
      // Refetch everything under the new identity (also resumes a page behind the expired sheet),
      // with the profile from the login response already in place
      await queryClient.invalidateQueries();
      queryClient.setQueryData(queryKeys.me, result.user);
      return result;
    },
  });

export const signOut = () => {
  useSessionStore.getState().signOut();
  usePendingActionStore.getState().clearPendingAction();
  queryClient.clear();
};

// Contract §2: INVALID_CREDENTIALS carries one message for a wrong email or password.
// The server's Arabic message is shown; the local text covers a missing one.
export const loginErrorMessage = (err: unknown): string => {
  if (isApiError(err)) {
    if (err.code === 'NETWORK_ERROR') return t.auth.networkError;
    if (err.message) return err.message;
    if (err.code === 'INVALID_CREDENTIALS') return t.auth.invalidCredentials;
  }
  return t.auth.unexpectedError;
};
