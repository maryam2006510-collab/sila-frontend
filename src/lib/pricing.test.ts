// @vitest-environment node
// Client estimates with the commission tiers of GET /api/config (API_CONTRACT.md §4 System)

import { describe, it, expect } from 'vitest';
import {
  commissionRate,
  estimateOrder,
  holdingsByKarat,
  holdingsValue,
  livePriceFor,
  nextTier,
  sumOf,
  tierFor,
} from './pricing';
import type { CommissionTier, MarketPrices, Transaction } from './types';

// The server's tiers, as adapted from /api/config
const TIERS: CommissionTier[] = [
  { label: '< 50 g', label_ar: 'أقل من 50 غ', min_grams: null, max_grams: 49.999, rate: 0.015 },
  { label: '50-200 g', label_ar: 'من 50 إلى 200 غ', min_grams: 50, max_grams: 200, rate: 0.01 },
  { label: '> 200 g', label_ar: 'أكثر من 200 غ', min_grams: 200.001, max_grams: null, rate: 0.005 },
];

const PRICES: MarketPrices = {
  price_24k: 179_994.21,
  price_22k: 164_994.69,
  price_21k: 157_494.93,
  price_18k: 134_995.66,
  usd_24k: 137.56,
  usd_iqd_rate: 1308.4454,
  xau_usd_per_ounce: 4278.7,
  change_24h_pct: 0.0116,
  last_updated: '2026-09-24T16:38:50Z',
  source: 'live',
  is_stale: false,
};

const tx = (karat: Transaction['karat'], grams: number, principal = 0): Transaction => ({
  id: `tx-${karat}-${grams}`,
  asset_id: 'a',
  karat,
  seller_name: 's',
  buyer_ref: null,
  purchased_weight_grams: grams,
  execution_price_per_gram: 0,
  principal_amount: principal,
  commission_rate: 0,
  commission_amount: 0,
  total_paid_by_investor: 0,
  created_at: '2026-09-20T00:00:00Z',
});

describe('commission tiers (from the server config)', () => {
  it('uses inclusive bounds: 49.999 → 1.5%, 50 and 200 → 1.0%, 200.001 → 0.5%', () => {
    expect(commissionRate(49.999, TIERS)).toBe(0.015);
    expect(commissionRate(50, TIERS)).toBe(0.01);
    expect(commissionRate(200, TIERS)).toBe(0.01);
    expect(commissionRate(200.001, TIERS)).toBe(0.005);
  });

  it('finds the tier and the next cheaper one', () => {
    expect(tierFor(10, TIERS)?.rate).toBe(0.015);
    expect(nextTier(45, TIERS)).toEqual({ threshold: 50, rate: 0.01 });
    expect(nextTier(150, TIERS)).toEqual({ threshold: 200.001, rate: 0.005 });
    expect(nextTier(300, TIERS)).toBeNull();
  });
});

describe('estimateOrder', () => {
  it('matches the server preview for 2.500 g of 21K at 157,524.37 (393,810.93 + 5,907.16)', () => {
    const est = estimateOrder(2.5, 157_524.37, TIERS);
    expect(est.principal).toBe(393_810.93);
    expect(est.rate).toBe(0.015);
    expect(est.commission).toBe(5_907.16);
    expect(est.total).toBe(399_718.09);
  });

  it('is exact where floating point is not (0.1 + 0.2 style sums)', () => {
    expect(estimateOrder(0.3, 100.1, TIERS).principal).toBe(30.03);
  });
});

describe('holdings', () => {
  const history = [tx(21, 10, 1_574_000), tx(22, 55.5, 9_152_282.45), tx(21, 0.1), tx(21, 0.2)];

  it('sums grams per karat exactly', () => {
    expect(holdingsByKarat(history)).toEqual([
      { karat: 22, grams: 55.5 },
      { karat: 21, grams: 10.3 },
    ]);
  });

  it('values each karat at its own live price', () => {
    expect(holdingsValue([tx(21, 10)], PRICES)).toBe(1_574_949.3);
    expect(livePriceFor(PRICES, 18)).toBe(134_995.66);
  });

  it('sums a field exactly', () => {
    expect(sumOf([tx(21, 0.1), tx(21, 0.2)], 'purchased_weight_grams')).toBe(0.3);
    expect(sumOf(history, 'principal_amount')).toBe(10_726_282.45);
  });
});
