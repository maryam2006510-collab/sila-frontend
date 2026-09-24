// src/components/ui/toastStore.ts
// Toast queue. Transient confirmations only; money and form feedback stays inline (08-ux §3.6).

import { create } from 'zustand';

export type ToastType = 'success' | 'danger' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  // 0 = stays until dismissed (errors never auto-dismiss)
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${crypto.randomUUID()}`;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().addToast({ type: 'success', title, message }),
  danger: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'danger', title, message, duration: 0 }),
  info: (title: string, message?: string) => useToastStore.getState().addToast({ type: 'info', title, message }),
};
