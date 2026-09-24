// src/lib/validation.ts
// Client-side mirrors of server validation rules (the server still decides)

import { fmtGrams } from './formatters';
import type { Messages } from '@/i18n/ar';

// Purchase quantity (workflow 05 step 1): > 0 and <= AvailableWeightGrams
export const gramsError = (grams: number, available: number, t: Messages): string | undefined => {
  if (!(grams > 0)) return t.estimate.gramsPositive;
  if (grams > available) return t.estimate.gramsMax(fmtGrams(available));
  return undefined;
};
