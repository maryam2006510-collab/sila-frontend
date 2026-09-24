// src/i18n/index.ts
// Only Arabic ships for now (PLAN.md §0). Adding English = add `en.ts` with the
// same shape, list it in `messages`, and add 'en' to SUPPORTED_LOCALES.

import { ar, Messages } from './ar';
import { useLocale, Locale } from '@/lib/direction';

const messages: Partial<Record<Locale, Messages>> = { ar };

export const t: Messages = ar;

export const useT = (): Messages => messages[useLocale()] ?? ar;

export type { Messages };
