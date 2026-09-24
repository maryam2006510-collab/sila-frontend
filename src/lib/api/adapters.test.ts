// @vitest-environment node
// The wire ⇄ domain boundary (API_CONTRACT.md §1), fed with real responses from the backend

import { describe, it, expect } from 'vitest';
import {
  gramsOut,
  iqdOut,
  toListing,
  toMarketPrices,
  toMatch,
  toOwnership,
  toPreview,
  toServerConfig,
} from './adapters';
import type * as W from './wire';

describe('outgoing values', () => {
  it('sends grams with 3 decimals and IQD with 2, as strings', () => {
    expect(gramsOut(2.5)).toBe('2.500');
    expect(gramsOut(10.1234)).toBe('10.123');
    expect(iqdOut(1_000_000)).toBe('1000000.00');
  });
});

describe('incoming values', () => {
  it('reads every karat price and turns the percent change into a fraction', () => {
    const wire: W.MarketPricesOut = {
      base_currency: 'IQD',
      karats: [
        { karat: 24, price_per_gram_iqd: '179994.21', price_per_gram_usd: '137.56' },
        { karat: 22, price_per_gram_iqd: '164994.69', price_per_gram_usd: '126.10' },
        { karat: 21, price_per_gram_iqd: '157494.93', price_per_gram_usd: '120.37' },
        { karat: 18, price_per_gram_iqd: '134995.66', price_per_gram_usd: '103.17' },
      ],
      usd_iqd: '1308.4454',
      xau_usd_per_ounce: '4278.7002',
      change_24h_pct: '1.16',
      updated_at: '2026-09-24T16:38:50.817516Z',
      source: 'live',
      is_stale: false,
    };
    const prices = toMarketPrices(wire);
    expect(prices.price_21k).toBe(157_494.93);
    expect(prices.change_24h_pct).toBeCloseTo(0.0116, 10);
    expect(toMarketPrices({ ...wire, change_24h_pct: null }).change_24h_pct).toBeNull();
  });

  const listing: W.ListingOut = {
    id: '34e2d700-2ba4-48a9-944b-f0fa4c0cd904',
    seller_id: '44a4a5a6-7f8b-4510-9a6c-2ecd617b88c5',
    seller_name: 'مجوهرات الكرّادة',
    seller_kyc_verified: true,
    karat: 21,
    total_weight_grams: '84.250',
    available_weight_grams: '74.250',
    base_price_per_gram: '157410.26',
    current_price_per_gram: '157410.26',
    status: 'active',
    is_promoted: true,
    promotion_expiry_date: '2026-09-29T16:39:42.151362Z',
    created_at: '2026-09-12T16:39:42.151362Z',
    updated_at: '2026-09-24T16:39:44.065376Z',
  };

  it('maps a listing (seller_kyc_verified → seller_verified, strings → numbers)', () => {
    const l = toListing(listing);
    expect(l.available_weight_grams).toBe(74.25);
    expect(l.current_price_per_gram).toBe(157_410.26);
    expect(l.seller_verified).toBe(true);
  });

  it('keeps match fractions consistent: budget share "100.00" → 1, score stays 0..1', () => {
    const match = toMatch({
      budget_iqd: '1000000',
      risk_profile: 'medium',
      engine: 'rules',
      message: 'وجدنا 1 عروض مناسبة لميزانيتك',
      results: [
        {
          rank: 1,
          listing,
          suggested_weight_grams: '5.970',
          execution_price_per_gram: '165025.53',
          estimated_total_iqd: '999980.45',
          commission_rate: '0.0150',
          budget_usage_pct: '100.00',
          score: '1.0000',
          reason: 'r',
        },
      ],
    });
    expect(match.results[0].budget_usage_pct).toBe(1);
    expect(match.results[0].score).toBe(1);
    expect(match.results[0].commission_rate).toBe(0.015);
  });

  it('keeps the quote token, its expiry and a null risk insight with its note', () => {
    const quote = toPreview({
      asset_id: listing.id,
      karat: 21,
      purchased_weight_grams: '2.500',
      execution_price_per_gram: '157524.37',
      principal_amount: '393810.93',
      commission_rate: '0.0150',
      commission_amount: '5907.16',
      total_paid_by_investor: '399718.09',
      price_updated_at: '2026-09-24T16:41:50.837702Z',
      quoted_at: '2026-09-24T16:42:11.745212Z',
      quote_expires_at: '2026-09-24T16:43:11.745212Z',
      quote_token: 'token.sig',
      risk_insight: null,
      risk_insight_note: 'التحليل الذكي غير متاح حالياً',
    });
    expect(quote.total_paid_by_investor).toBe(399_718.09);
    expect(quote.quote_token).toBe('token.sig');
    expect(quote.risk_insight_note).toBe('التحليل الذكي غير متاح حالياً');
  });

  it('carries the ownership disclaimer and a null signature for a new investor', () => {
    const o = toOwnership({
      investor_id: 'x',
      total_accumulated_grams: '0.000',
      verified: true,
      digital_signature_token: null,
      updated_at: null,
      message: 'ابدأ أول استثمار',
      disclaimer: 'التوقيع الرقمي إثبات تقني داخلي',
    });
    expect(o.total_accumulated_grams).toBe(0);
    expect(o.disclaimer).toBe('التوقيع الرقمي إثبات تقني داخلي');
    expect(o.message).toBe('ابدأ أول استثمار');
  });

  it('reads the config tiers with open-ended bounds', () => {
    const c = toServerConfig({
      currency: 'IQD',
      supported_karats: [24, 22, 21, 18],
      commission_tiers: [
        { label: '< 50 g', label_ar: 'أقل من 50 غ', min_grams: null, max_grams: '49.999', rate: '0.0150' },
        { label: '> 200 g', label_ar: 'أكثر من 200 غ', min_grams: '200.001', max_grams: null, rate: '0.0050' },
      ],
      promotion_fee_iqd: '25000',
      promotion_duration_days: 7,
      subscription_price_iqd: '15000',
      subscription_duration_days: 30,
      quote_ttl_seconds: 60,
    });
    expect(c.commission_tiers[0]).toEqual({
      label: '< 50 g',
      label_ar: 'أقل من 50 غ',
      min_grams: null,
      max_grams: 49.999,
      rate: 0.015,
    });
    expect(c.promotion_fee_iqd).toBe(25_000);
  });
});
