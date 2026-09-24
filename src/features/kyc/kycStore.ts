// src/features/kyc/kycStore.ts
// Opens the single global KYC sheet from any sensitive action (workflow 02)

import { create } from 'zustand';
import { UserRole } from '@/lib/types';
import { PendingAction, usePendingActionStore } from '@/lib/pendingAction';

export interface KycRequest {
  role: UserRole;
  // The interrupted action, persisted so it survives a reload or a re-login
  pendingAction?: PendingAction;
  // Runs right after verification: resends the interrupted request with the SAME
  // Idempotency-Key (API_CONTRACT.md §5 and §6, "auto-retry the original action")
  onVerified?: () => void;
}

interface KycState {
  request: KycRequest | null;
  // Increments per request; keys the sheet so each one starts fresh
  requestId: number;
  open: (request: KycRequest) => void;
  close: () => void;
}

export const useKycStore = create<KycState>((set) => ({
  request: null,
  requestId: 0,
  open: (request) => {
    if (request.pendingAction) usePendingActionStore.getState().setPendingAction(request.pendingAction);
    set((s) => ({ request, requestId: s.requestId + 1 }));
  },
  close: () => set({ request: null }),
}));

export const openKyc = (request: KycRequest) => useKycStore.getState().open(request);
