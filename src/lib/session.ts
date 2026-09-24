// src/lib/session.ts
// Reactive view of the auth session for guards and the "session expired" sheet

import { create } from 'zustand';
import { tokens } from './api/tokens';

interface SessionState {
  hasSession: boolean;
  // true when a live session could not be refreshed; the current page stays
  // mounted (inputs intact) behind a login sheet, per 08-ux §3.2
  expired: boolean;
  signedIn: (access: string, refresh: string) => void;
  markExpired: () => void;
  signOut: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  hasSession: tokens.hasSession(),
  expired: false,
  signedIn: (access, refresh) => {
    tokens.set(access, refresh);
    set({ hasSession: true, expired: false });
  },
  markExpired: () => {
    tokens.clear();
    set({ hasSession: false, expired: true });
  },
  signOut: () => {
    tokens.clear();
    set({ hasSession: false, expired: false });
  },
}));
