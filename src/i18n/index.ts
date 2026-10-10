// src/i18n/index.ts
// Arabic (default) and English (D45). Components read their copy with useT(), so a language
// switch re-renders them; code outside React (API helpers, toasts fired from stores, form
// schemas) reads messagesNow() at the moment it runs.

import { ar, Messages } from './ar';
import { en } from './en';
import { useLocale, useLocaleStore, Locale } from '@/lib/direction';

const messages: Record<Locale, Messages> = { ar, en };

export const useT = (): Messages => messages[useLocale()];

export const messagesNow = (): Messages => messages[useLocaleStore.getState().locale];

export type { Messages };
