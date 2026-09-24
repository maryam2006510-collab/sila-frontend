// src/app/theme.ts
// Theme Management per UI Kit 01-color-system.md §4

import { create } from 'zustand';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

// Default = system preference, remembered after a manual switch
const getInitialTheme = (): Theme => {
  try {
    const saved = localStorage.getItem('sila-theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage blocked: fall through to system preference
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('sila-theme', theme);
    } catch {
      // Storage blocked: keep in memory only
    }
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));
