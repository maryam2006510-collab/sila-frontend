// src/lib/tiers.ts
// Arabic labels and nudge wording for the commission tiers of GET /api/config.
// Bounds are inclusive grams with 3 decimals: 49.999 reads "أقل من 50", 200.001 "أكثر من 200".

import Decimal from 'decimal.js';
import { CommissionTier } from './types';
import { fmtNumber } from './formatters';
import type { Messages } from '@/i18n';

const whole = (g: number, round: 'up' | 'down') =>
  fmtNumber(new Decimal(g).toDecimalPlaces(0, round === 'up' ? Decimal.ROUND_UP : Decimal.ROUND_DOWN).toNumber());

export const tierLabel = (tier: CommissionTier, t: Messages): string => {
  if (tier.min_grams === null && tier.max_grams !== null) return t.tiers.below(whole(tier.max_grams, 'up'));
  if (tier.max_grams === null && tier.min_grams !== null) return t.tiers.above(whole(tier.min_grams, 'down'));
  if (tier.min_grams !== null && tier.max_grams !== null)
    return t.tiers.between(fmtNumber(tier.min_grams), fmtNumber(tier.max_grams));
  return tier.label;
};

// A tier that starts on a whole gram begins "at" it (50 g); one that starts at 200.001
// begins "above" 200 g
export const tierStart = (threshold: number): { at: boolean; grams: number } =>
  Number.isInteger(threshold) ? { at: true, grams: threshold } : { at: false, grams: Math.floor(threshold) };
