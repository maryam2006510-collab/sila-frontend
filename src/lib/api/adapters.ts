// src/lib/api/adapters.ts
// The one boundary between the wire (API_CONTRACT.md) and the UI's domain types.
// In: decimal strings become numbers for display (lossless at these magnitudes); percentage
// strings ("1.16", "100.00") become fractions so every percentage in the UI is formatted the
// same way. Out: grams are sent as strings with 3 decimals and IQD with 2, as the contract asks.

import Decimal from 'decimal.js';
import type * as W from './wire';
import type {
  AssetListing,
  ChartRange,
  ConfirmResult,
  Insights,
  Karat,
  MarketPrices,
  MatchResponse,
  Ownership,
  Page,
  Payment,
  PriceHistory,
  PromoteResult,
  RiskInsight,
  ServerConfig,
  SubscriptionStatus,
  Transaction,
  TransactionPreview,
  User,
  LoginResult,
} from '../types';

// ---- Scalars ---------------------------------------------------------------

const num = (s: string): number => Number(s);
const numOrNull = (s: string | null | undefined): number | null => (s == null ? null : Number(s));
// "1.16" (percent) → 0.0116
const pctToFraction = (s: string | null | undefined): number | null =>
  s == null ? null : new Decimal(s).div(100).toNumber();
const karat = (k: number): Karat => k as Karat;
const seconds = (iso: string): number => Math.floor(new Date(iso).getTime() / 1000);

export const gramsOut = (g: number | string): string => new Decimal(g).toFixed(3, Decimal.ROUND_DOWN);
export const iqdOut = (v: number | string): string => new Decimal(v).toFixed(2, Decimal.ROUND_HALF_UP);

// ---- Identity --------------------------------------------------------------

export const toUser = (u: W.UserOut): User => ({
  id: u.id,
  role: u.role,
  full_name: u.full_name,
  email: u.email,
  kyc_verified: u.kyc_verified,
  risk_profile: u.risk_profile ?? null,
  subscription_tier: u.subscription_tier,
  subscription_expiry_date: u.subscription_expiry_date ?? null,
  is_premium_active: u.is_premium_active,
  created_at: u.created_at,
});

export const toLoginResult = (r: W.LoginOut): LoginResult => ({
  access_token: r.access_token,
  refresh_token: r.refresh_token,
  user: toUser(r.user),
});

// ---- Market ----------------------------------------------------------------

export const toMarketPrices = (p: W.MarketPricesOut): MarketPrices => {
  const iqd = (k: number) => num(p.karats.find((x) => x.karat === k)?.price_per_gram_iqd ?? '0');
  return {
    price_24k: iqd(24),
    price_22k: iqd(22),
    price_21k: iqd(21),
    price_18k: iqd(18),
    usd_24k: num(p.karats.find((x) => x.karat === 24)?.price_per_gram_usd ?? '0'),
    usd_iqd_rate: num(p.usd_iqd),
    xau_usd_per_ounce: num(p.xau_usd_per_ounce),
    change_24h_pct: pctToFraction(p.change_24h_pct),
    last_updated: p.updated_at,
    source: p.source,
    is_stale: p.is_stale,
  };
};

export const toPriceHistory = (h: W.PriceHistoryOut): PriceHistory => ({
  karat: karat(h.karat),
  range: h.range as ChartRange,
  points: h.points.map((pt) => ({ time: seconds(pt.ts), value: num(pt.price_per_gram) })),
});

// ---- Listings --------------------------------------------------------------

export const toListing = (l: W.ListingOut): AssetListing => ({
  id: l.id,
  seller_id: l.seller_id,
  seller_name: l.seller_name,
  seller_verified: l.seller_kyc_verified,
  karat: karat(l.karat),
  total_weight_grams: num(l.total_weight_grams),
  available_weight_grams: num(l.available_weight_grams),
  base_price_per_gram: num(l.base_price_per_gram),
  current_price_per_gram: numOrNull(l.current_price_per_gram),
  status: l.status,
  is_promoted: l.is_promoted,
  promotion_expiry_date: l.promotion_expiry_date ?? null,
  created_at: l.created_at,
  updated_at: l.updated_at,
});

export const toPage = <In, Out>(
  p: { items: In[]; total: number; limit: number; offset: number },
  map: (x: In) => Out
): Page<Out> => ({
  items: p.items.map(map),
  total: p.total,
  limit: p.limit,
  offset: p.offset,
});

const toPayment = (p: W.PromoteOut['payment']): Payment => ({
  status: p.status,
  payment_ref: p.payment_ref,
  amount_iqd: num(p.amount_iqd),
  purpose: p.purpose,
});

export const toPromoteResult = (r: W.PromoteOut): PromoteResult => ({
  listing: toListing(r.listing),
  payment: toPayment(r.payment),
});

// ---- AI --------------------------------------------------------------------

const toRisk = (r: NonNullable<W.PreviewOut['risk_insight']>): RiskInsight => ({
  level: r.level,
  insight: r.insight,
  signals: r.signals,
  engine: r.engine,
});

export const toRiskAnalysis = (r: W.RiskAnalysisOut): RiskInsight => toRisk(r);

export const toMatch = (m: W.MatchOut): MatchResponse => ({
  budget_iqd: num(m.budget_iqd),
  risk_profile: m.risk_profile ?? null,
  engine: m.engine,
  message: m.message,
  results: m.results.map((r) => ({
    rank: r.rank,
    listing: toListing(r.listing),
    suggested_weight_grams: num(r.suggested_weight_grams),
    execution_price_per_gram: num(r.execution_price_per_gram),
    estimated_total_iqd: num(r.estimated_total_iqd),
    commission_rate: num(r.commission_rate),
    budget_usage_pct: pctToFraction(r.budget_usage_pct) ?? 0,
    score: num(r.score),
    reason: r.reason,
  })),
});

export const toInsights = (i: W.InsightsOut): Insights => ({
  engine: i.engine,
  alerts: i.alerts,
  market: {
    price_24k_per_gram: num(i.market.price_24k_per_gram),
    change_24h_pct: pctToFraction(i.market.change_24h_pct),
    change_7d_pct: pctToFraction(i.market.change_7d_pct),
    change_30d_pct: pctToFraction(i.market.change_30d_pct),
    high_7d: numOrNull(i.market.high_7d),
    low_7d: numOrNull(i.market.low_7d),
    trend: i.market.trend,
    summary: i.market.summary,
  },
  portfolio: {
    total_grams: num(i.portfolio.total_grams),
    total_paid_iqd: num(i.portfolio.total_paid_iqd),
    current_value_iqd: num(i.portfolio.current_value_iqd),
    unrealized_pnl_iqd: num(i.portfolio.unrealized_pnl_iqd),
    unrealized_pnl_pct: pctToFraction(i.portfolio.unrealized_pnl_pct),
    transactions_count: i.portfolio.transactions_count,
    by_karat: i.portfolio.by_karat.map((k) => ({
      karat: karat(k.karat),
      grams: num(k.grams),
      current_value_iqd: num(k.current_value_iqd),
    })),
  },
});

// ---- Orders ----------------------------------------------------------------

export const toTransaction = (t: W.TransactionOut): Transaction => ({
  id: t.id,
  asset_id: t.asset_id,
  karat: karat(t.karat),
  seller_name: t.seller_name,
  buyer_ref: t.buyer_ref ?? null,
  purchased_weight_grams: num(t.purchased_weight_grams),
  execution_price_per_gram: num(t.execution_price_per_gram),
  principal_amount: num(t.principal_amount),
  commission_rate: num(t.commission_rate),
  commission_amount: num(t.commission_amount),
  total_paid_by_investor: num(t.total_paid_by_investor),
  created_at: t.created_at,
});

export const toPreview = (p: W.PreviewOut): TransactionPreview => ({
  asset_id: p.asset_id,
  karat: karat(p.karat),
  purchased_weight_grams: num(p.purchased_weight_grams),
  execution_price_per_gram: num(p.execution_price_per_gram),
  principal_amount: num(p.principal_amount),
  commission_rate: num(p.commission_rate),
  commission_amount: num(p.commission_amount),
  total_paid_by_investor: num(p.total_paid_by_investor),
  price_updated_at: p.price_updated_at,
  quoted_at: p.quoted_at,
  quote_expires_at: p.quote_expires_at,
  quote_token: p.quote_token,
  risk_insight: p.risk_insight ? toRisk(p.risk_insight) : null,
  risk_insight_note: p.risk_insight_note ?? null,
});

export const toConfirmResult = (c: W.ConfirmOut): ConfirmResult => ({
  transaction: toTransaction(c.transaction),
  total_accumulated_grams: num(c.ownership.total_accumulated_grams),
  listing_status: c.listing_status as ConfirmResult['listing_status'],
  listing_available_weight_grams: num(c.listing_available_weight_grams),
  idempotent_replay: Boolean(c.idempotent_replay),
});

// ---- Subscription, ownership, config ----------------------------------------

export const toSubscription = (s: W.SubscriptionStatusOut): SubscriptionStatus => ({
  subscription_tier: s.subscription_tier,
  subscription_expiry_date: s.subscription_expiry_date ?? null,
  is_active: s.is_active,
  days_remaining: s.days_remaining,
  price_iqd: num(s.price_iqd),
  duration_days: s.duration_days,
});

export const toOwnership = (o: W.OwnershipOut): Ownership => ({
  investor_id: o.investor_id,
  total_accumulated_grams: num(o.total_accumulated_grams),
  verified: o.verified,
  digital_signature_token: o.digital_signature_token ?? null,
  updated_at: o.updated_at ?? null,
  message: o.message ?? null,
  disclaimer: o.disclaimer ?? null,
});

export const toServerConfig = (c: W.PublicConfigOut): ServerConfig => ({
  currency: c.currency,
  supported_karats: c.supported_karats.map(karat),
  commission_tiers: c.commission_tiers.map((tier) => ({
    label: tier.label,
    label_ar: tier.label_ar,
    min_grams: numOrNull(tier.min_grams),
    max_grams: numOrNull(tier.max_grams),
    rate: num(tier.rate),
  })),
  promotion_fee_iqd: num(c.promotion_fee_iqd),
  promotion_duration_days: c.promotion_duration_days,
  subscription_price_iqd: num(c.subscription_price_iqd),
  subscription_duration_days: c.subscription_duration_days,
  quote_ttl_seconds: c.quote_ttl_seconds,
});
