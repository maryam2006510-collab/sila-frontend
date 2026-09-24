// src/lib/pendingAction.ts
// Preserved intent across KYC/Auth interrupts per 08-ux-user-flows.md §3.5

import { create } from 'zustand';

export interface PendingAction<T = unknown> {
  type: 'purchase' | 'create_listing' | 'promote_listing' | 'subscribe';
  payload: T;
  returnTo: string;
}

interface PendingActionState {
  pendingAction: PendingAction | null;
  setPendingAction: (action: PendingAction | null) => void;
  clearPendingAction: () => void;
}

const STORAGE_KEY = 'sila_pending_action';

const loadSavedAction = (): PendingAction | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const usePendingActionStore = create<PendingActionState>((set) => ({
  pendingAction: loadSavedAction(),
  setPendingAction: (action) => {
    try {
      if (action) {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Safe fallback if sessionStorage is blocked
    }
    set({ pendingAction: action });
  },
  clearPendingAction: () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Safe fallback
    }
    set({ pendingAction: null });
  },
}));
