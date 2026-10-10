// src/lib/types.ts
// Domain types the UI works with. They mirror API_CONTRACT.md one to one; the only change is
// that decimal strings ("84.250", "157060.58") arrive here as numbers for display. The wire
// shapes live in api/wire.ts and are converted in api/adapters.ts (the only place that knows
// both). Client-side arithmetic on these values goes through decimal.js (lib/pricing.ts).

// admin: created by a server command only, never through signup
export type UserRole = 'investor' | 'seller' | 'admin';
export type RiskProfile = 'low' | 'medium' | 'high';
export type SubscriptionTier = 'free' | 'premium';
export type Karat = 18 | 21 | 22 | 24;
// withdrawn: an investor resale taken off the market for good (unsold grams released)
export type ListingStatus = 'active' | 'sold_out' | 'suspended' | 'withdrawn';
// investor_resale: part of an investor's holdings offered on the market (Workflow 09)
export type ListingType = 'seller_listing' | 'investor_resale';
export type AiEngine = 'rules' | 'llm';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  kyc_verified: boolean;
  risk_profile: RiskProfile | null;
  subscription_tier: SubscriptionTier;
  subscription_expiry_date: string | null;
  // Premium gate: the server's date check, never subscription_tier (contract §3.6)
  is_premium_active: boolean;
  // Signed in with a temporary password from an admin: a new one comes first
  must_change_password: boolean;
  created_at: string;
}

// GET /api/market/prices
export interface MarketPrices {
  price_24k: number;
  price_22k: number;
  price_21k: number;
  price_18k: number;
  usd_24k: number;
  usd_iqd_rate: number;
  xau_usd_per_ounce: number;
  // Fraction (0.0116 = +1.16%); null until the server has 24h of history
  change_24h_pct: number | null;
  last_updated: string;
  source: string;
  // Provider down: the figures are the last cached ones
  is_stale: boolean;
}

export type ChartRange = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface PricePoint {
  // Unix seconds (UTC)
  time: number;
  value: number;
}

// GET /api/market/prices/history
export interface PriceHistory {
  karat: Karat;
  range: ChartRange;
  points: PricePoint[];
}

export interface AssetListing {
  id: string;
  seller_id: string;
  // For an investor resale a neutral label from the server, never the investor's name
  seller_name: string;
  listing_type: ListingType;
  seller_verified: boolean;
  karat: Karat;
  total_weight_grams: number;
  available_weight_grams: number;
  // Reference price at creation
  base_price_per_gram: number;
  // The buy price now (null when the market price is unavailable)
  current_price_per_gram: number | null;
  status: ListingStatus;
  // Already expiry-aware on the server
  is_promoted: boolean;
  promotion_expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export type ListingSort = 'promoted_first' | 'newest' | 'price_asc' | 'price_desc';

// GET /api/listings filters (price filters apply to base_price_per_gram)
export interface ListingFilters {
  karat?: Karat;
  min_price?: number;
  max_price?: number;
  sort?: ListingSort;
}

export interface Payment {
  status: string;
  payment_ref: string;
  amount_iqd: number;
  purpose: string;
}

export interface PromoteResult {
  listing: AssetListing;
  payment: Payment;
}

export interface RiskInsight {
  level: RiskLevel;
  insight: string;
  signals: string[];
  engine: AiEngine;
}

export interface TransactionPreviewRequest {
  asset_id: string;
  purchased_weight_grams: number;
}

// POST /api/transactions/preview: a signed quote, valid until quote_expires_at
export interface TransactionPreview {
  asset_id: string;
  karat: Karat;
  purchased_weight_grams: number;
  execution_price_per_gram: number;
  principal_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_paid_by_investor: number;
  price_updated_at: string;
  quoted_at: string;
  quote_expires_at: string;
  quote_token: string;
  risk_insight: RiskInsight | null;
  // Shown when risk_insight is null ("التحليل الذكي غير متاح حالياً"); never blocks checkout
  risk_insight_note: string | null;
}

export interface Transaction {
  id: string;
  asset_id: string;
  karat: Karat;
  // buy: I bought. sell: sold from my listing (seller) or my resale (investor)
  side: 'buy' | 'sell';
  seller_name: string;
  // Sellers see this pseudonym only, never the buyer's identity
  buyer_ref: string | null;
  purchased_weight_grams: number;
  execution_price_per_gram: number;
  principal_amount: number;
  commission_rate: number;
  commission_amount: number;
  total_paid_by_investor: number;
  created_at: string;
}

// POST /api/transactions/confirm
export interface ConfirmResult {
  transaction: Transaction;
  total_accumulated_grams: number;
  listing_status: ListingStatus;
  listing_available_weight_grams: number;
  idempotent_replay: boolean;
}

// GET /api/ownership/me
export interface Ownership {
  investor_id: string;
  total_accumulated_grams: number;
  verified: boolean;
  digital_signature_token: string | null;
  updated_at: string | null;
  // e.g. "ابدأ أول استثمار" for a new investor
  message: string | null;
  // Always shown next to the balance (System Design §6)
  disclaimer: string | null;
  // Per karat, derived from the transaction log; sums to the total
  by_karat: KaratBalance[];
}

export interface KaratBalance {
  karat: Karat;
  owned_grams: number;
  // Offered in open resale listings: still owned until sold
  reserved_grams: number;
  available_to_resell_grams: number;
}

export interface MatchResult {
  rank: number;
  listing: AssetListing;
  suggested_weight_grams: number;
  execution_price_per_gram: number;
  estimated_total_iqd: number;
  commission_rate: number;
  // Fraction of the budget used (0.98 = 98%)
  budget_usage_pct: number;
  score: number;
  reason: string;
}

export interface MatchResponse {
  budget_iqd: number;
  risk_profile: RiskProfile | null;
  engine: AiEngine;
  // Explains an empty result (budget too small)
  message: string;
  results: MatchResult[];
}

// POST /api/ai/advisor (API_CONTRACT §4 AI Advisor)
export interface AdvisorBudget {
  amount_iqd: number;
  // request = sent as budget_iqd; question_digits / question_words = read from the question
  source: 'request' | 'question_digits' | 'question_words';
  // false = read from words: no suggestion until the user confirms it
  confirmed: boolean;
}

export interface AdvisorAnswer {
  // llm = worded by the model; rules = the simplified rule-based answer
  engine: AiEngine;
  // Plain text; the live figures are not repeated in it
  answer: string;
  // About prices, money, the budget or holdings: show the figures panel
  show_figures: boolean;
  budget: AdvisorBudget | null;
  // The investor's own verified balance
  holdings_grams: number;
  // From the matcher (same as /api/ai/match), never from the model text
  suggestions: MatchResult[];
  market: {
    price_24k_per_gram: number;
    // Fraction (0.0116 = +1.16%); null until the server has 24h of history
    change_24h_pct: number | null;
    updated_at: string;
    is_stale: boolean;
  };
  // Up to 3 questions fitted to this one: they become the next quick questions
  follow_up_questions: string[];
  // Always shown under the answer
  disclaimer: string;
}

export interface MarketTrend {
  price_24k_per_gram: number;
  change_24h_pct: number | null;
  change_7d_pct: number | null;
  change_30d_pct: number | null;
  high_7d: number | null;
  low_7d: number | null;
  trend: 'up' | 'down' | 'flat';
  summary: string;
}

export interface PortfolioPerformance {
  total_grams: number;
  total_paid_iqd: number;
  current_value_iqd: number;
  unrealized_pnl_iqd: number;
  unrealized_pnl_pct: number | null;
  transactions_count: number;
  by_karat: Array<{ karat: Karat; grams: number; current_value_iqd: number }>;
}

// GET /api/ai/insights (Premium)
export interface Insights {
  engine: AiEngine;
  alerts: string[];
  market: MarketTrend;
  portfolio: PortfolioPerformance;
}

export interface SubscriptionStatus {
  subscription_tier: SubscriptionTier;
  subscription_expiry_date: string | null;
  is_active: boolean;
  days_remaining: number;
  price_iqd: number;
  duration_days: number;
}

export interface CommissionTier {
  label: string;
  // Arabic display text from the server (e.g. "أقل من 50 غ")
  label_ar: string;
  // Inclusive bounds in grams; null = open-ended
  min_grams: number | null;
  max_grams: number | null;
  rate: number;
}

// GET /api/config: displayed as-is, never hard-coded (contract §4 System)
export interface ServerConfig {
  currency: string;
  supported_karats: Karat[];
  commission_tiers: CommissionTier[];
  promotion_fee_iqd: number;
  promotion_duration_days: number;
  subscription_price_iqd: number;
  subscription_duration_days: number;
  quote_ttl_seconds: number;
}

export interface SignupRequest {
  // Admins are created on the server only
  role: Exclude<UserRole, 'admin'>;
  full_name: string;
  email: string;
  password: string;
  risk_profile?: RiskProfile;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResult extends AuthTokens {
  user: User;
}

// ---- Integrated platform (2026-10-10) ---------------------------------------

// GET /api/notifications (in-app only, the topbar bell)
export interface AppNotification {
  id: string;
  kind: string;
  title: string;
  body: string;
  // In-app path to open
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface Notifications {
  items: AppNotification[];
  unread_count: number;
}

// Premium price alerts
export type AlertDirection = 'above' | 'below';
export type AlertStatus = 'active' | 'triggered' | 'cancelled';

export interface PriceAlert {
  id: string;
  karat: Karat;
  direction: AlertDirection;
  target_price_per_gram: number;
  status: AlertStatus;
  triggered_at: string | null;
  created_at: string;
}

export type InterestAssetClass = 'real_estate' | 'oil';

// Administration (admin only)
export interface AdminOverview {
  investors: number;
  sellers: number;
  inactive_accounts: number;
  premium_active: number;
  active_listings: number;
  active_resale_listings: number;
  transactions: number;
  volume_iqd: number;
  commission_iqd: number;
  pending_password_requests: number;
  interest: Record<InterestAssetClass, number>;
}

export interface AdminUser {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  kyc_verified: boolean;
  is_active: boolean;
  is_premium_active: boolean;
  must_change_password: boolean;
  created_at: string;
}

export type ResetRequestStatus = 'pending' | 'resolved' | 'dismissed';

export interface PasswordResetRequest {
  id: string;
  email: string;
  user_id: string | null;
  user_name: string | null;
  status: ResetRequestStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface AuditEntry {
  id: number;
  event_type: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface InterestSignup {
  email: string;
  asset_class: InterestAssetClass;
  created_at: string;
}
