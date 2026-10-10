// src/features/auth/session.ts
// Login / logout actions shared by LoginPage, SignupPage and the session-expired sheet

import { useMutation } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api';
import { useSessionStore } from '@/lib/session';
import { queryClient } from '@/lib/queryClient';
import { queryKeys } from '@/lib/queries';
import { usePendingActionStore } from '@/lib/pendingAction';
import { LoginRequest } from '@/lib/types';
import { useLocaleStore } from '@/lib/direction';
import { messagesNow } from '@/i18n';

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

// A password change returns fresh tokens (every older session stops working): keep this one
export const useChangePassword = () =>
  useMutation({
    mutationFn: async ({ current, next }: { current: string; next: string }) => {
      const result = await api.changePassword(current, next);
      useSessionStore.getState().signedIn(result.access_token, result.refresh_token);
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
  const t = messagesNow();
  if (isApiError(err)) {
    // The server's message is Arabic: other languages use their own text for the code (D45)
    if (err.code !== 'NETWORK_ERROR' && useLocaleStore.getState().locale !== 'ar') {
      return t.errors[err.code] ?? t.auth.unexpectedError;
    }
    if (err.code === 'NETWORK_ERROR') return t.auth.networkError;
    if (err.message) return err.message;
    if (err.code === 'INVALID_CREDENTIALS') return t.auth.invalidCredentials;
  }
  return t.auth.unexpectedError;
};
