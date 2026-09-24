// src/lib/pricing.ts
// Client-side estimates (labelled "تقديري"). The server's preview is the source of truth, and
// every rate here comes from GET /api/config (never hard-coded, contract §4 System).
// Arithmetic runs on decimal.js as the contract asks; results are numbers for display.

import Decimal from 'decimal.js';
import { CommissionTier, Karat, MarketPrices, Transaction } from './types';

export const KARATS: readonly Karat[] = [24, 22, 21, 18];

export const livePriceFor = (prices: MarketPrices, karat: Karat): number => {
  switch (karat) {
    case 24:
      return prices.price_24k;
    case 22:
      return prices.price_22k;
    case 21:
      return prices.price_21k;
    case 18:
      return prices.price_18k;
  }
};

// Tiers ordered by their lower bound (open-ended first)
const sorted = (tiers: CommissionTier[]) =>
  [...tiers].sort((a, b) => (a.min_grams ?? -Infinity) - (b.min_grams ?? -Infinity));

// The tier whose inclusive bounds contain `grams`
export const tierFor = (grams: number, tiers: CommissionTier[]): CommissionTier | undefined =>
  sorted(tiers).find(
    (t) => (t.min_grams === null || grams >= t.min_grams) && (t.max_grams === null || grams <= t.max_grams)
  );

export const commissionRate = (grams: number, tiers: CommissionTier[]): number => tierFor(grams, tiers)?.rate ?? 0;

// The next (cheaper) tier and where it starts, for the transparent tier nudge (08-ux §8 Step 5.1)
export const nextTier = (grams: number, tiers: CommissionTier[]): { threshold: number; rate: number } | null => {
  const ordered = sorted(tiers);
  const index = ordered.findIndex((t) => t === tierFor(grams, tiers));
  const next = index >= 0 ? ordered[index + 1] : undefined;
  return next && next.min_grams !== null ? { threshold: next.min_grams, rate: next.rate } : null;
};

export const TIER_NUDGE_WINDOW_G = 10;

// Holdings per karat from the purchase history (the ownership record only stores total
// grams). Value = Σ grams(karat) × live price(karat), never grams × 24K.
export const holdingsByKarat = (transactions: Transaction[]): { karat: Karat; grams: number }[] =>
  KARATS.map((karat) => ({
    karat,
    grams: transactions
      .filter((tx) => tx.karat === karat)
      .reduce((sum, tx) => sum.plus(tx.purchased_weight_grams), new Decimal(0))
      .toNumber(),
  })).filter((h) => h.grams > 0);

export const holdingsValue = (transactions: Transaction[], prices: MarketPrices): number =>
  holdingsByKarat(transactions)
    .reduce((sum, h) => sum.plus(new Decimal(h.grams).times(livePriceFor(prices, h.karat))), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();

// Σ of one field over transactions, exact (grams sold, amount received)
export const sumOf = (transactions: Transaction[], field: 'purchased_weight_grams' | 'principal_amount'): number =>
  transactions.reduce((sum, tx) => sum.plus(tx[field]), new Decimal(0)).toNumber();

export interface OrderEstimate {
  principal: number;
  rate: number;
  commission: number;
  total: number;
}

// Same order of operations as the server: principal and commission rounded to 2 decimals
export const estimateOrder = (grams: number, pricePerGram: number, tiers: CommissionTier[]): OrderEstimate => {
  const principal = new Decimal(grams).times(pricePerGram).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const rate = commissionRate(grams, tiers);
  const commission = principal.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return {
    principal: principal.toNumber(),
    rate,
    commission: commission.toNumber(),
    total: principal.plus(commission).toNumber(),
  };
};
