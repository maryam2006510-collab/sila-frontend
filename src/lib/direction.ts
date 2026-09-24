// src/lib/direction.ts
// Direction & Locale Management

import { create } from 'zustand';

export type Locale = 'ar' | 'en';
export type Direction = 'rtl' | 'ltr';

// English is structurally supported but not shipped yet (PLAN.md §0)
export const SUPPORTED_LOCALES: readonly Locale[] = ['ar'];
export const isMultiLocale = SUPPORTED_LOCALES.length > 1;

const directionOf = (locale: Locale): Direction => (locale === 'ar' ? 'rtl' : 'ltr');

const getInitialLocale = (): Locale => {
  try {
    const saved = localStorage.getItem('sila-locale') as Locale | null;
    if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
  } catch {
    // Storage blocked: fall back to default
  }
  return 'ar';
};

interface DirectionState {
  locale: Locale;
  direction: Direction;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const initialLocale = getInitialLocale();

export const useLocaleStore = create<DirectionState>((set, get) => ({
  locale: initialLocale,
  direction: directionOf(initialLocale),
  setLocale: (locale) => {
    if (!SUPPORTED_LOCALES.includes(locale)) return;
    try {
      localStorage.setItem('sila-locale', locale);
    } catch {
      // Storage blocked: keep in memory only
    }
    document.documentElement.lang = locale;
    document.documentElement.dir = directionOf(locale);
    set({ locale, direction: directionOf(locale) });
  },
  toggleLocale: () => {
    const next = get().locale === 'ar' ? 'en' : 'ar';
    get().setLocale(next);
  },
}));

export const useDirection = (): Direction => useLocaleStore((state) => state.direction);

export const useLocale = (): Locale => useLocaleStore((state) => state.locale);

// Phosphor `mirrored` prop for icons that express reading direction (03-icon §6)
export const useMirrored = (): boolean => useDirection() === 'rtl';
