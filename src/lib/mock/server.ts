// src/lib/mock/server.ts
// In-memory stand-in for the FastAPI backend, active only when VITE_USE_MOCK=true.
// It speaks API_CONTRACT.md exactly: the same paths (/api/...), the same JSON (decimal
// strings, pages, ISO UTC dates), the same error body and codes, and the same rules
// (roles, KYC gate, signed 60 s quotes, PRICE_CHANGED, Idempotency-Key replays, tiers from
// /api/config, premium by expiry date). The UI therefore runs identically in both modes.

import Decimal from 'decimal.js';
import type { TransportRequest, TransportResponse } from '../api/http';
import type * as W from '../api/wire';
import type { Karat, ListingStatus, RiskProfile, SubscriptionTier, UserRole } from '../types';
import {
  DEMO_PASSWORD,
  GRAMS_PER_OUNCE,
  MOCK_CONFIG,
  MOCK_DAY_MS,
  OWNERSHIP_DISCLAIMER,
  SEED_LISTINGS,
  SEED_PURCHASES,
  SEED_USERS,
  USD_IQD,
  XAU_USD_PER_OUNCE,
} from './data';

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------
const LATENCY_MS = 220;
const DAY_MS = MOCK_DAY_MS;
const YEAR_MS = 365 * DAY_MS;
const VALID_KARATS: Karat[] = [24, 22, 21, 18];
const MIN_MATCH_GRAMS = 0.1;

// --------------------------------------------------------------------------
// Wire formatting (contract §1)
// --------------------------------------------------------------------------
const D = (v: Decimal.Value) => new Decimal(v);
const g3 = (v: Decimal.Value) => D(v).toFixed(3, Decimal.ROUND_DOWN);
const m2 = (v: Decimal.Value) => D(v).toFixed(2, Decimal.ROUND_HALF_UP);
const r4 = (v: Decimal.Value) => D(v).toFixed(4);
const iso = (ms: number) => new Date(ms).toISOString();
const uuid = () => crypto.randomUUID();

// --------------------------------------------------------------------------
// Market: a live 24K price that drifts, and a deterministic history ending at it
// --------------------------------------------------------------------------
const baseLive24 = D(XAU_USD_PER_OUNCE).div(GRAMS_PER_OUNCE).times(USD_IQD);
let liveOffset = D(0);
let lastUpdated = Date.now();

let tickerStarted = false;
const ensureTicker = () => {
  if (tickerStarted) return;
  tickerStarted = true;
  setInterval(() => {
    liveOffset = liveOffset.plus((Math.random() - 0.48) * 120);
    lastUpdated = Date.now();
  }, 5000);
};

const live24 = () => baseLive24.plus(liveOffset);

// ~+17.5% over the year (like the backend seed), with gentle deterministic waves
const price24At = (t: number): Decimal => {
  const now = Date.now();
  if (t >= now) return live24();
  const back = now - t;
  const trend = 1 - (0.175 * back) / YEAR_MS;
  const wave = 1 + 0.004 * Math.sin(t / 2.1e7) + 0.0015 * Math.cos(t / 5.3e6);
  return live24()
    .times(trend)
    .times(wave / (1 + 0.004 * Math.sin(now / 2.1e7) + 0.0015 * Math.cos(now / 5.3e6)));
};

const karatPriceFrom = (p24: Decimal, karat: number) => p24.times(karat).div(24).toDecimalPlaces(2);
const karatPriceNow = (karat: number) => karatPriceFrom(live24(), karat);

const change24hPct = () => {
  const then = price24At(Date.now() - DAY_MS);
  return live24().minus(then).div(then).times(100);
};

const RANGE_BUCKETS: Record<W.ChartRangeWire, { span: number; step: number }> = {
  '1D': { span: DAY_MS, step: 10 * 60_000 },
  '1W': { span: 7 * DAY_MS, step: 3_600_000 },
  '1M': { span: 30 * DAY_MS, step: 4 * 3_600_000 },
  '3M': { span: 90 * DAY_MS, step: 12 * 3_600_000 },
  '1Y': { span: 365 * DAY_MS, step: DAY_MS },
};

// --------------------------------------------------------------------------
// State (reset on every page load, seeded like the backend)
// --------------------------------------------------------------------------
interface UserRec {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  password: string;
  kyc_verified: boolean;
  risk_profile: RiskProfile | null;
  subscription_tier: SubscriptionTier;
  subscription_expiry_date: string | null;
  is_active: boolean;
  must_change_password: boolean;
  // Password version (ms of the last change): tokens carry it and must match
  pwv: number;
  created_at: string;
}

interface ListingRec {
  id: string;
  seller_id: string;
  karat: Karat;
  listing_type: 'seller_listing' | 'investor_resale';
  total: Decimal;
  available: Decimal;
  base_price: Decimal;
  status: ListingStatus;
  is_promoted: boolean;
  promotion_expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

interface TxRec {
  id: string;
  investor_id: string;
  asset_id: string;
  karat: Karat;
  seller_name: string;
  grams: Decimal;
  price: Decimal;
  principal: Decimal;
  rate: Decimal;
  commission: Decimal;
  total: Decimal;
  created_at: string;
}

interface OwnershipRec {
  grams: Decimal;
  updated_at: string;
}

const users: UserRec[] = [];
const listings: ListingRec[] = [];
const transactions: TxRec[] = [];
const ownership = new Map<string, OwnershipRec>();

interface NotificationRec {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}
interface AlertRec {
  id: string;
  user_id: string;
  karat: Karat;
  direction: 'above' | 'below';
  target: Decimal;
  status: 'active' | 'triggered' | 'cancelled';
  triggered_at: string | null;
  created_at: string;
}
interface ResetRec {
  id: string;
  email: string;
  user_id: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at: string | null;
}
interface AuditRec {
  id: number;
  event_type: string;
  actor_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  data: Record<string, unknown>;
  created_at: string;
}
const notificationsStore: NotificationRec[] = [];
const alertsStore: AlertRec[] = [];
const resetRequests: ResetRec[] = [];
const interestStore: { email: string; asset_class: 'real_estate' | 'oil'; created_at: string }[] = [];
const auditLog: AuditRec[] = [];

const RESALE_SELLER_LABEL = 'مستثمر على صِلة';
const sellerLabel = (l: ListingRec) =>
  l.listing_type === 'investor_resale' ? RESALE_SELLER_LABEL : users.find((u) => u.id === l.seller_id)!.full_name;

const notify = (userId: string, kind: string, title: string, body: string, link: string | null) => {
  notificationsStore.unshift({
    id: uuid(),
    user_id: userId,
    kind,
    title,
    body,
    link,
    read: false,
    created_at: iso(Date.now()),
  });
};
const audit = (
  event_type: string,
  actor_id: string | null,
  entity_type: string | null,
  entity_id: string | null,
  data: Record<string, unknown> = {}
) => {
  auditLog.unshift({
    id: auditLog.length + 1,
    event_type,
    actor_id,
    entity_type,
    entity_id,
    data,
    created_at: iso(Date.now()),
  });
};
// Idempotency-Key → the first response (confirm and listing creation)
const idempotency = new Map<string, unknown>();

// --------------------------------------------------------------------------
// Rules shared by seed and live requests
// --------------------------------------------------------------------------
const tiers = MOCK_CONFIG.commission_tiers.map((t) => ({
  min: t.min_grams === null ? null : D(t.min_grams),
  max: t.max_grams === null ? null : D(t.max_grams),
  rate: D(t.rate),
}));

const commissionRate = (grams: Decimal) =>
  tiers.find((t) => (t.min === null || grams.gte(t.min)) && (t.max === null || grams.lte(t.max)))?.rate ?? D(0);

const breakdown = (grams: Decimal, price: Decimal) => {
  const principal = grams.times(price).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const rate = commissionRate(grams);
  const commission = principal.times(rate).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return { principal, rate, commission, total: principal.plus(commission) };
};

const isPremiumActive = (u: UserRec) =>
  Boolean(u.subscription_expiry_date) && new Date(u.subscription_expiry_date!).getTime() > Date.now();

const isPromotedNow = (l: ListingRec) =>
  l.is_promoted && Boolean(l.promotion_expiry_date) && new Date(l.promotion_expiry_date!).getTime() > Date.now();

// Deterministic stand-in for the server's HMAC-SHA256 ownership signature
const signature = (input: string) => {
  let out = '';
  let h = 5381;
  for (let round = 0; out.length < 64; round++) {
    for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i) + round) >>> 0;
    out += h.toString(16).padStart(8, '0');
  }
  return out.slice(0, 64);
};

const purchase = (
  investor: UserRec,
  listing: ListingRec,
  grams: Decimal,
  price: Decimal,
  at: number,
  announce = false
): TxRec => {
  const b = breakdown(grams, price);
  // Atomic on the real server (SELECT ... FOR UPDATE); single-threaded here
  listing.available = listing.available.minus(grams);
  if (listing.available.lte(0)) {
    listing.available = D(0);
    listing.status = 'sold_out';
  }
  listing.updated_at = iso(at);
  const tx: TxRec = {
    id: uuid(),
    investor_id: investor.id,
    asset_id: listing.id,
    karat: listing.karat,
    seller_name: sellerLabel(listing),
    grams,
    price,
    principal: b.principal,
    rate: b.rate,
    commission: b.commission,
    total: b.total,
    created_at: iso(at),
  };
  transactions.unshift(tx);
  const record = ownership.get(investor.id) ?? { grams: D(0), updated_at: iso(at) };
  record.grams = record.grams.plus(grams);
  record.updated_at = iso(at);
  ownership.set(investor.id, record);
  // Investor resale: the grams leave the reseller's record in the same step (Workflow 09)
  if (listing.listing_type === 'investor_resale') {
    const from = ownership.get(listing.seller_id)!;
    from.grams = from.grams.minus(grams);
    from.updated_at = iso(at);
  }
  if (announce) {
    const g = grams.toString();
    notify(
      investor.id,
      'purchase_completed',
      'تمت عملية الشراء',
      `اشتريت ${g} غرام عيار ${listing.karat}، وانضافت لرصيدك الموثّق.`,
      '/app/portfolio'
    );
    if (listing.listing_type === 'investor_resale') {
      notify(
        listing.seller_id,
        'resale_sold',
        'انباع جزء من عرضك',
        `انباع ${g} غرام عيار ${listing.karat} من عرض إعادة البيع مالتك.`,
        '/app/portfolio'
      );
    } else {
      notify(
        listing.seller_id,
        'listing_sold',
        'عملية بيع جديدة',
        `انباع ${g} غرام عيار ${listing.karat} من عرضك.`,
        '/app/sales'
      );
    }
  }
  return tx;
};

// Grams per karat: bought minus resold (derived, like the server)
const holdingsByKarat = (investorId: string) => {
  const out = new Map<Karat, Decimal>(VALID_KARATS.map((k) => [k, D(0)]));
  for (const t of transactions) {
    if (t.investor_id === investorId) out.set(t.karat, out.get(t.karat)!.plus(t.grams));
    const l = listings.find((x) => x.id === t.asset_id);
    if (l && l.listing_type === 'investor_resale' && l.seller_id === investorId) {
      out.set(t.karat, out.get(t.karat)!.minus(t.grams));
    }
  }
  return out;
};
const reservedByKarat = (investorId: string) => {
  const out = new Map<Karat, Decimal>(VALID_KARATS.map((k) => [k, D(0)]));
  for (const l of listings) {
    if (
      l.listing_type === 'investor_resale' &&
      l.seller_id === investorId &&
      (l.status === 'active' || l.status === 'suspended')
    ) {
      out.set(l.karat, out.get(l.karat)!.plus(l.available));
    }
  }
  return out;
};

// Seed (mirrors the backend's app/scripts/seed.py)
{
  const now = Date.now();
  for (const u of SEED_USERS) {
    users.push({
      id: u.id,
      role: u.role,
      full_name: u.full_name,
      email: u.email,
      password: DEMO_PASSWORD,
      kyc_verified: u.kyc_verified,
      risk_profile: u.risk_profile,
      subscription_tier: u.subscription_tier,
      subscription_expiry_date: u.subscription_days === null ? null : iso(now + u.subscription_days * DAY_MS),
      is_active: true,
      must_change_password: false,
      pwv: 0,
      created_at: iso(now - 30 * DAY_MS),
    });
  }
  // Mock only: on the real backend the admin comes from `python -m app.scripts.create_admin`
  users.push({
    id: '00000000-0000-4000-8900-000000000001',
    role: 'admin',
    full_name: 'إدارة صِلة',
    email: 'admin@sila.iq',
    password: DEMO_PASSWORD,
    kyc_verified: true,
    risk_profile: null,
    subscription_tier: 'free',
    subscription_expiry_date: null,
    is_active: true,
    must_change_password: false,
    pwv: 0,
    created_at: iso(now - 60 * DAY_MS),
  });
  for (const l of SEED_LISTINGS) {
    const seller = users.find((u) => u.email === l.seller_email)!;
    const created = now - l.days_ago * DAY_MS;
    listings.push({
      id: l.id,
      seller_id: seller.id,
      karat: l.karat,
      listing_type: 'seller_listing',
      total: D(l.grams),
      available: D(l.grams),
      base_price: karatPriceNow(l.karat),
      status: l.status,
      is_promoted: l.promoted_days !== null,
      promotion_expiry_date: l.promoted_days === null ? null : iso(now + l.promoted_days * DAY_MS),
      created_at: iso(created),
      updated_at: iso(created),
    });
  }
  for (const p of SEED_PURCHASES) {
    const investor = users.find((u) => u.email === p.investor_email)!;
    const listing = listings.find((l) => l.id === p.listing_id)!;
    purchase(investor, listing, D(p.grams), karatPriceNow(listing.karat), now - p.days_ago * DAY_MS);
  }
}

// --------------------------------------------------------------------------
// Serializers (domain records → wire DTOs)
// --------------------------------------------------------------------------
const userOut = (u: UserRec): W.UserOut => ({
  id: u.id,
  role: u.role,
  full_name: u.full_name,
  email: u.email,
  kyc_verified: u.kyc_verified,
  risk_profile: u.risk_profile,
  // A stale 'premium' with a past date reads as free (the backend's daily job does this)
  subscription_tier: isPremiumActive(u) ? 'premium' : u.subscription_tier === 'premium' ? 'free' : u.subscription_tier,
  subscription_expiry_date: u.subscription_expiry_date,
  is_premium_active: isPremiumActive(u),
  must_change_password: u.must_change_password,
  created_at: u.created_at,
});

const listingOut = (l: ListingRec): W.ListingOut => {
  const seller = users.find((u) => u.id === l.seller_id)!;
  return {
    id: l.id,
    seller_id: l.seller_id,
    seller_name: sellerLabel(l),
    listing_type: l.listing_type,
    seller_kyc_verified: seller.kyc_verified,
    karat: l.karat,
    total_weight_grams: g3(l.total),
    available_weight_grams: g3(l.available),
    base_price_per_gram: m2(l.base_price),
    current_price_per_gram: m2(karatPriceNow(l.karat)),
    status: l.status,
    is_promoted: isPromotedNow(l),
    promotion_expiry_date: l.promotion_expiry_date,
    created_at: l.created_at,
    updated_at: l.updated_at,
  };
};

// Sellers see a stable pseudonym, never the buyer's identity
const buyerRef = (investorId: string) => `مستثمر #${investorId.replace(/-/g, '').slice(-4).toUpperCase()}`;

const txOut = (t: TxRec, viewer: UserRec): W.TransactionOut => ({
  id: t.id,
  asset_id: t.asset_id,
  karat: t.karat,
  side: t.investor_id === viewer.id ? 'buy' : 'sell',
  seller_name: t.seller_name,
  buyer_ref: t.investor_id === viewer.id ? null : buyerRef(t.investor_id),
  purchased_weight_grams: g3(t.grams),
  execution_price_per_gram: m2(t.price),
  principal_amount: m2(t.principal),
  commission_rate: r4(t.rate),
  commission_amount: m2(t.commission),
  total_paid_by_investor: m2(t.total),
  created_at: t.created_at,
});

const pricesOut = (): W.MarketPricesOut => {
  const p24 = live24();
  return {
    base_currency: 'IQD',
    karats: VALID_KARATS.map((k) => {
      const iqd = karatPriceFrom(p24, k);
      return { karat: k, price_per_gram_iqd: m2(iqd), price_per_gram_usd: m2(iqd.div(USD_IQD)) };
    }),
    usd_iqd: r4(USD_IQD),
    xau_usd_per_ounce: r4(p24.div(USD_IQD).times(GRAMS_PER_OUNCE)),
    change_24h_pct: m2(change24hPct()),
    updated_at: iso(lastUpdated),
    source: 'mock',
    is_stale: false,
  };
};

const page = <T>(items: T[], q: URLSearchParams) => {
  const limit = Math.min(100, Math.max(1, Number(q.get('limit')) || 20));
  const offset = Math.max(0, Number(q.get('offset')) || 0);
  return { items: items.slice(offset, offset + limit), total: items.length, limit, offset };
};

// --------------------------------------------------------------------------
// Quotes: signed, bound to the investor, the listing and the exact grams, 60 s TTL
// --------------------------------------------------------------------------
interface Quote {
  asset_id: string;
  investor_id: string;
  grams: string;
  price: string;
  exp: number;
}
const encodeQuote = (q: Quote) => {
  const body = btoa(JSON.stringify(q));
  return `${body}.${signature(body)}`;
};
const decodeQuote = (token: string): Quote | null => {
  const [body, sig] = token.split('.');
  if (!body || sig !== signature(body)) return null;
  try {
    return JSON.parse(atob(body)) as Quote;
  } catch {
    return null;
  }
};

// --------------------------------------------------------------------------
// Errors (contract §2), with the contract's Arabic messages
// --------------------------------------------------------------------------
// Like a real network, every response is a fresh copy: handing out live objects would let a
// later in-place change reach the cache with the same reference, so the UI never re-rendered
const ok = (body: unknown, status = 200): TransportResponse => ({
  status,
  body: body === undefined ? body : structuredClone(body),
});
const fail = (status: number, error_code: string, message: string, details?: W.ErrorResponse['details']) => ({
  status,
  body: { error_code, message, status, ...(details ? { details } : {}) } satisfies W.ErrorResponse,
});
const unauthorized = () => fail(401, 'UNAUTHORIZED', 'يجب تسجيل الدخول');
const forbidden = () => fail(403, 'FORBIDDEN', 'ليس لديك صلاحية لتنفيذ هذا الإجراء');
const notFound = () => fail(404, 'NOT_FOUND', 'العنصر المطلوب غير موجود');
const invalid = (field: string, message: string) =>
  fail(422, 'VALIDATION_ERROR', 'البيانات المدخلة غير صالحة', [{ field, message }]);
const kycRequired = () => fail(403, 'KYC_NOT_VERIFIED', 'يجب إكمال التوثيق قبل إتمام عملية الشراء');
const notActive = () => fail(409, 'LISTING_NOT_ACTIVE', 'هذا العرض غير متاح حالياً');

// --------------------------------------------------------------------------
// Tokens and testing switches
// --------------------------------------------------------------------------
// Tokens embed the user id so a page reload (which resets mock state) keeps demo sessions alive
const accessTokenFor = (u: UserRec) => `mock-access.${u.id}.${u.pwv}.${uuid().slice(0, 8)}`;
const refreshTokenFor = (u: UserRec) => `mock-refresh.${u.id}.${u.pwv}.${uuid().slice(0, 8)}`;
// Like the server: an inactive account, or a token from an earlier password, is refused
const userFromToken = (token: string, kind: 'access' | 'refresh'): UserRec | null => {
  const [prefix, userId, pwv] = token.split('.');
  if (prefix !== `mock-${kind}`) return null;
  const u = users.find((x) => x.id === userId);
  return u && u.is_active && String(u.pwv) === pwv ? u : null;
};
const tokensFor = (u: UserRec): W.TokenOut => ({
  access_token: accessTokenFor(u),
  refresh_token: refreshTokenFor(u),
  token_type: 'bearer',
  expires_in: 900,
});

const userFromHeaders = (headers: Record<string, string>): UserRec | null => {
  const auth = headers.Authorization ?? headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return userFromToken(auth.slice(7), 'access');
};

const readSetting = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Testing switches (README):
//   localStorage.setItem('sila-mock-latency', '3000')         every response waits 3 s
//   localStorage.setItem('sila-mock-fail', '/listings')       paths containing it return 500
//   localStorage.setItem('sila-mock-integrity-fail', '1')     GET /api/ownership/me → 403
const latencyMs = () => {
  const custom = Number(readSetting('sila-mock-latency'));
  return Number.isFinite(custom) && custom > 0 ? custom : LATENCY_MS;
};
const forcedFailure = (path: string) => {
  const needle = readSetting('sila-mock-fail');
  return Boolean(needle) && path.includes(needle!);
};

// --------------------------------------------------------------------------
// AI (rules engine)
// --------------------------------------------------------------------------
const preferredKarats: Record<RiskProfile, Karat[]> = { low: [24, 22], medium: [22, 21], high: [18, 21] };
const karatReason: Record<Karat, string> = {
  24: 'عيار 24 الأعلى نقاءً ويحفظ القيمة على المدى الطويل',
  22: 'عيار 22 توازن بين النقاء والسعر',
  21: 'عيار 21 الأكثر تداولاً وسيولة',
  18: 'عيار 18 الأقل سعراً للغرام',
};
const riskName: Record<RiskProfile, string> = { low: 'منخفض', medium: 'متوسط', high: 'مرتفع' };

const NO_MATCH = 'ماكو عروض تناسب هذي الميزانية حالياً';
const ADVISOR_DISCLAIMER = 'هذي المعلومات استرشادية وليست نصيحة مالية. قرار الشراء يرجعلك.';
const advisorRiskTip: Record<RiskProfile, string> = {
  low: 'ملفك منخفض المخاطرة، فالأفضل تبدي بكمية صغيرة وتقسّم شراءك على أكثر من مرة.',
  medium: 'ملفك متوسط المخاطرة، فوازن بين الكمية والعيار وما تحط كل ميزانيتك مرة وحدة.',
  high: 'ملفك يقبل مخاطرة أعلى، بس حتى هيج لا تحط كل ميزانيتك بصفقة وحدة.',
};
const fmtWhole = (v: Decimal) => v.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber().toLocaleString('en-US');

// Ranked listings for a budget: the matcher behind /ai/match and /ai/advisor (top 5)
const matchResults = (profile: RiskProfile, budget: Decimal, viewerId = ''): W.MatchOut['results'] =>
  listings
    .filter((l) => l.status === 'active' && l.seller_id !== viewerId)
    .map((l) => {
      const price = karatPriceNow(l.karat);
      // Grams whose principal + commission fits the budget, capped by availability
      let grams = budget.div(price.times(D(1).plus(commissionRate(budget.div(price)))));
      grams = Decimal.min(grams, l.available).toDecimalPlaces(3, Decimal.ROUND_DOWN);
      const b = breakdown(grams, price);
      const usage = b.total.div(budget).times(100);
      const preferred = preferredKarats[profile].includes(l.karat);
      const score = Decimal.min(
        1,
        usage
          .div(100)
          .times(0.7)
          .plus(preferred ? 0.3 : 0.1)
      ).toDecimalPlaces(4);
      return { l, price, grams, b, usage, score, preferred };
    })
    .filter((c) => c.grams.gte(MIN_MATCH_GRAMS))
    .sort((a, b) => b.score.comparedTo(a.score) || b.usage.comparedTo(a.usage))
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      listing: listingOut(c.l),
      suggested_weight_grams: g3(c.grams),
      execution_price_per_gram: m2(c.price),
      estimated_total_iqd: m2(c.b.total),
      commission_rate: r4(c.b.rate),
      budget_usage_pct: m2(c.usage),
      score: r4(c.score),
      reason: `${karatReason[c.l.karat]}${c.preferred ? ` ويناسب ملف مخاطرة ${riskName[profile]}` : ''}. يمكنك شراء ${g3(c.grams)} غرام بإجمالي ${fmtWhole(c.b.total)} دينار (${m2(c.usage)}% من ميزانيتك).`,
    }));

// A budget read from the advisor question, like app/modules/ai/budget.py (simplified): digits are
// explicit, words ("مليونين", "نص مليون", "3 ملايين", "500 ألف") need confirmation.
const parseAdvisorBudget = (
  question: string
): { amount_iqd: string; source: 'question_digits' | 'question_words' } | null => {
  const text = question
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[أإآ]/g, 'ا')
    .replace(/\b0\d{9,}\b/g, ' ');
  const words = (amount: number) => ({ amount_iqd: String(amount), source: 'question_words' as const });
  const unit = text.match(/(\d+(?:\.\d+)?)\s*(مليون|ملايين|الف|الاف)/);
  if (unit) {
    const factor = unit[2] === 'الف' || unit[2] === 'الاف' ? 1_000 : 1_000_000;
    const amount = Math.round(Number(unit[1]) * factor);
    if (amount >= 10_000) return words(amount);
  }
  const phrases: [RegExp, number][] = [
    [/مليون\s*و\s*(?:نص|نصف)/, 1_500_000],
    [/ربع\s+مليون/, 250_000],
    [/(?:نص|نصف)\s+مليون/, 500_000],
    [/مليونين/, 2_000_000],
    [/مليون/, 1_000_000],
  ];
  for (const [re, amount] of phrases) if (re.test(text)) return words(amount);
  for (const token of text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []) {
    const value = Number(token.replace(/,$/, '').replace(/,/g, ''));
    if (value >= 10_000) return { amount_iqd: value.toFixed(2), source: 'question_digits' };
  }
  return null;
};

// Like app/modules/ai/advisor.py: a question about money shows the figures panel
const MONEY_TOPIC =
  /سعر|اسعار|ذهب|عيار|غرام|شراء|اشتري|اشتر|بيع|استثمار|استثمر|ميزاني|مبلغ|فلوس|دينار|رصيد|محفظ|ربح|خسار|عرض|عروض|سوق|مليون|ملايين|الف|عمول|ادخار|انوع|تنويع|وقت مناسب/;
const ADVISOR_OFF_TOPIC =
  'هذا السؤال برا مواضيع الاستثمار بالذهب على صِلة. أكدر أساعدك بأسعار الذهب اليوم، وبعروض تناسب ميزانيتك وملفك الاستثماري.';
type AdvisorState = 'off_topic' | 'missing' | 'needs_confirmation' | 'offers' | 'no_offers';
const ADVISOR_FOLLOW_UPS: Record<AdvisorState, string[]> = {
  off_topic: ['شنو أحسن عرض لميزانيتي؟', 'هل هسة وقت مناسب للشراء؟', 'شنو الفرق بين العيارات؟'],
  missing: ['شنو الفرق بين عيار 21 وعيار 24؟', 'شلون تنحسب العمولة بصِلة؟', 'أشتري مرة وحدة لو على دفعات؟'],
  needs_confirmation: ['شنو الفرق بين عيار 21 وعيار 24؟', 'شلون تنحسب العمولة بصِلة؟'],
  offers: ['ليش العرض 1 هو الأنسب إلي؟', 'أقسّم شرائي على أكثر من مرة؟', 'شنو الفرق بين عيار 21 وعيار 24؟'],
  no_offers: ['شلون أبدي بميزانية صغيرة؟', 'شنو العيار اللي يعطيني غرامات أكثر؟'],
};

const advisorState = (
  moneyTopic: boolean,
  budget: W.AdvisorOut['budget'],
  suggestions: W.MatchOut['results']
): AdvisorState => {
  if (!moneyTopic) return 'off_topic';
  if (!budget) return 'missing';
  if (!budget.confirmed) return 'needs_confirmation';
  return suggestions.length ? 'offers' : 'no_offers';
};

const advisorAnswer = (
  state: AdvisorState,
  profile: RiskProfile,
  budget: W.AdvisorOut['budget'],
  suggestions: W.MatchOut['results']
): string => {
  if (state === 'off_topic') return ADVISOR_OFF_TOPIC;
  const change = change24hPct();
  const parts = [
    change.gt(0)
      ? 'الذهب ارتفع خلال آخر 24 ساعة.'
      : change.lt(0)
        ? 'الذهب نزل خلال آخر 24 ساعة.'
        : 'سعر الذهب مستقر خلال آخر 24 ساعة.',
  ];
  if (!budget) parts.push('حتى أقترح عليك عروض تناسبك، اختار ميزانيتك أو اكتبها.');
  else if (!budget.confirmed)
    parts.push(`فهمت إن ميزانيتك ${fmtWhole(D(budget.amount_iqd))} دينار، أكّدها حتى أطلعلك العروض المناسبة.`);
  else if (suggestions.length) {
    const best = suggestions[0];
    parts.push(
      `أنسب خيار لميزانيتك هو العرض 1: ${D(best.suggested_weight_grams).toString()} غرام عيار ${best.listing.karat} بإجمالي ${fmtWhole(D(best.estimated_total_iqd))} دينار شامل العمولة.`,
      advisorRiskTip[profile]
    );
  } else parts.push(`${NO_MATCH}، جرّب ميزانية أكبر أو تصفح السوق بنفسك.`);
  parts.push('تذكّر إن سعر الذهب ممكن ينزل مثل ما يصعد.');
  return parts.join(' ');
};

const riskInsight = (): NonNullable<W.PreviewOut['risk_insight']> => {
  const change = change24hPct();
  const high = change.abs().gt(2);
  const up = change.gte(0);
  return {
    level: high ? 'medium' : 'low',
    insight: high
      ? `السعر ${up ? 'ارتفع' : 'انخفض'} ${change.abs().toFixed(2)}% خلال 24 ساعة. الشراء على دفعات يقلل أثر التذبذب.`
      : 'مخاطر هذه الصفقة منخفضة حسب بيانات السوق الحالية. السعر مستقر مقارنة بالأيام الماضية.',
    signals: high ? [`تغيّر 24 ساعة: ${change.toFixed(2)}%`] : [],
    engine: 'rules',
  };
};

// --------------------------------------------------------------------------
// Router
// --------------------------------------------------------------------------
const checkAlerts = () => {
  for (const a of alertsStore) {
    if (a.status !== 'active') continue;
    const price = karatPriceNow(a.karat);
    const crossed = a.direction === 'above' ? price.gte(a.target) : price.lte(a.target);
    if (!crossed) continue;
    a.status = 'triggered';
    a.triggered_at = iso(Date.now());
    const verb = a.direction === 'above' ? 'ارتفع إلى' : 'نزل إلى';
    notify(
      a.user_id,
      'price_alert',
      `تنبيه سعر عيار ${a.karat}`,
      `سعر غرام عيار ${a.karat} ${verb} ${fmtWhole(price)} دينار (هدفك ${fmtWhole(a.target)} دينار).`,
      '/app/market'
    );
  }
};

export const mockTransport = async (req: TransportRequest): Promise<TransportResponse> => {
  ensureTicker();
  checkAlerts();
  await new Promise((r) => setTimeout(r, latencyMs()));

  const url = new URL(req.path, 'http://mock.local');
  const path = url.pathname;
  if (forcedFailure(path)) return fail(500, 'INTERNAL_ERROR', 'حدث خطأ غير متوقع');
  const q = url.searchParams;
  const method = req.method.toUpperCase();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const user = userFromHeaders(req.headers);
  const idemKey = req.headers['Idempotency-Key'];

  // ---- Identity & Security ------------------------------------------------
  if (method === 'POST' && path === '/api/auth/signup') {
    const role = body.role as UserRole;
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    const fullName = String(body.full_name ?? '').trim();
    if (role !== 'investor' && role !== 'seller') return invalid('role', 'Input should be investor or seller');
    if (!fullName) return invalid('full_name', 'Field required');
    if (!/^\S+@\S+\.\S+$/.test(email)) return invalid('email', 'value is not a valid email address');
    if (password.length < 8) return invalid('password', 'String should have at least 8 characters');
    if (password.length > 72) return invalid('password', 'String should have at most 72 characters');
    if (role === 'investor' && !['low', 'medium', 'high'].includes(String(body.risk_profile))) {
      return invalid('risk_profile', 'Investors must choose a risk profile');
    }
    if (role === 'seller' && body.risk_profile) return invalid('risk_profile', 'Sellers have no risk profile');
    if (users.some((u) => u.email === email)) return fail(409, 'EMAIL_ALREADY_EXISTS', 'هذا الإيميل مسجل مسبقاً');
    const created: UserRec = {
      id: uuid(),
      role,
      full_name: fullName,
      email,
      password,
      kyc_verified: false,
      risk_profile: role === 'investor' ? (body.risk_profile as RiskProfile) : null,
      subscription_tier: 'free',
      subscription_expiry_date: null,
      is_active: true,
      must_change_password: false,
      pwv: 0,
      created_at: iso(Date.now()),
    };
    users.push(created);
    return ok(userOut(created), 201);
  }

  if (method === 'POST' && path === '/api/auth/login') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const account = users.find((u) => u.email === email);
    if (!account || account.password !== body.password) {
      return fail(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }
    if (!account.is_active) return fail(403, 'ACCOUNT_DISABLED', 'هذا الحساب موقوف، تواصل مع إدارة صِلة');
    return ok({ ...tokensFor(account), user: userOut(account) } satisfies W.LoginOut);
  }

  // "Forgot password": a request for the admins, the same reply whether the e-mail exists or not
  if (method === 'POST' && path === '/api/auth/forgot-password') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return invalid('email', 'value is not a valid email address');
    const account = users.find((u) => u.email === email);
    const pending = resetRequests.some((r) => r.email === email && r.status === 'pending');
    if (!pending && account?.role !== 'admin') {
      resetRequests.unshift({
        id: uuid(),
        email,
        user_id: account?.id ?? null,
        status: 'pending',
        created_at: iso(Date.now()),
        resolved_at: null,
      });
      if (account) {
        for (const admin of users.filter((u) => u.role === 'admin' && u.is_active)) {
          notify(
            admin.id,
            'password_reset_request',
            'طلب استرجاع كلمة سر',
            `${account.full_name} (${email}) طلب كلمة سر جديدة.`,
            '/app/admin/password-requests'
          );
        }
      }
    }
    return ok(
      {
        message: 'إذا الإيميل مسجل عدنا، طلبك وصل لإدارة صِلة، وراح يتواصلون وياك بكلمة سر مؤقتة.',
      } satisfies W.MessageOut,
      202
    );
  }

  if (method === 'POST' && path === '/api/users/me/password') {
    if (!user) return unauthorized();
    if (body.current_password !== user.password) {
      return fail(401, 'INVALID_CREDENTIALS', 'كلمة السر الحالية غير صحيحة');
    }
    const next = String(body.new_password ?? '');
    if (next.length < 8) return invalid('new_password', 'String should have at least 8 characters');
    if (next === user.password) return fail(422, 'VALIDATION_ERROR', 'اختار كلمة سر جديدة تختلف عن الحالية');
    user.password = next;
    user.must_change_password = false;
    user.pwv = Date.now();
    audit('password_changed', user.id, 'user', user.id);
    return ok({ ...tokensFor(user), user: userOut(user) } satisfies W.LoginOut);
  }

  if (method === 'POST' && path === '/api/auth/refresh') {
    const account = userFromToken(String(body.refresh_token ?? ''), 'refresh');
    return account ? ok(tokensFor(account)) : unauthorized();
  }

  if (method === 'GET' && path === '/api/users/me') {
    return user ? ok(userOut(user)) : unauthorized();
  }

  if (method === 'POST' && (path === '/api/kyc/verify' || path === '/api/kyc/seller')) {
    if (!user) return unauthorized();
    if (user.role !== (path === '/api/kyc/seller' ? 'seller' : 'investor')) return forbidden();
    user.kyc_verified = true;
    return ok({ kyc_verified: true, message: 'تم التحقق من هويتك بنجاح', user: userOut(user) } satisfies W.KycOut);
  }

  // ---- Market Data ---------------------------------------------------------
  if (method === 'GET' && path === '/api/market/prices') return ok(pricesOut());

  if (method === 'GET' && path === '/api/market/prices/history') {
    const karat = Number(q.get('karat') ?? 24);
    const range = (q.get('range') ?? '1D') as W.ChartRangeWire;
    if (!VALID_KARATS.includes(karat as Karat)) return invalid('karat', 'Input should be 18, 21, 22 or 24');
    const bucket = RANGE_BUCKETS[range];
    if (!bucket) return invalid('range', 'Input should be 1D, 1W, 1M, 3M or 1Y');
    const end = Math.floor(Date.now() / bucket.step) * bucket.step;
    const points: W.PriceHistoryOut['points'] = [];
    for (let t = end - bucket.span; t <= end; t += bucket.step) {
      points.push({ ts: iso(t), price_per_gram: m2(karatPriceFrom(price24At(t), karat)) });
    }
    return ok({ karat, range, currency: 'IQD', points } satisfies W.PriceHistoryOut);
  }

  // ---- Listing & Asset ------------------------------------------------------
  if (method === 'GET' && path === '/api/listings') {
    let result: ListingRec[];
    if (q.get('seller_id') === 'me') {
      if (!user) return unauthorized();
      if (user.role !== 'seller') return forbidden();
      result = listings.filter((l) => l.seller_id === user.id);
      const status = q.get('status');
      if (status) result = result.filter((l) => l.status === status);
    } else {
      result = listings.filter((l) => l.status === 'active');
    }
    const karat = q.get('karat');
    const minPrice = q.get('min_price');
    const maxPrice = q.get('max_price');
    if (karat) result = result.filter((l) => l.karat === Number(karat));
    if (minPrice) result = result.filter((l) => l.base_price.gte(minPrice));
    if (maxPrice) result = result.filter((l) => l.base_price.lte(maxPrice));

    const sort = q.get('sort') ?? 'promoted_first';
    const newest = (a: ListingRec, b: ListingRec) => b.created_at.localeCompare(a.created_at);
    result = [...result].sort((a, b) => {
      if (sort === 'price_asc') return a.base_price.comparedTo(b.base_price);
      if (sort === 'price_desc') return b.base_price.comparedTo(a.base_price);
      if (sort === 'newest') return newest(a, b);
      const promoted = Number(isPromotedNow(b)) - Number(isPromotedNow(a));
      return promoted || newest(a, b);
    });
    return ok(page(result.map(listingOut), q) satisfies W.PageListingOut);
  }

  if (method === 'POST' && path === '/api/listings') {
    if (!user) return unauthorized();
    if (user.role !== 'seller') return forbidden();
    // A replay returns the same listing with 200 (contract §6)
    if (idemKey && idempotency.has(`listing:${idemKey}`)) return ok(idempotency.get(`listing:${idemKey}`), 200);
    if (!user.kyc_verified) return kycRequired();
    const weight = D(String(body.total_weight_grams ?? '0'));
    const karat = Number(body.karat) as Karat;
    if (!weight.gt(0)) return invalid('total_weight_grams', 'Input should be greater than 0');
    if (!VALID_KARATS.includes(karat)) return invalid('karat', 'Input should be 18, 21, 22 or 24');
    const now = iso(Date.now());
    const listing: ListingRec = {
      id: uuid(),
      seller_id: user.id,
      karat,
      listing_type: 'seller_listing',
      total: weight.toDecimalPlaces(3, Decimal.ROUND_DOWN),
      available: weight.toDecimalPlaces(3, Decimal.ROUND_DOWN),
      // Price is computed by the server; any price sent is ignored
      base_price: karatPriceNow(karat),
      status: 'active',
      is_promoted: false,
      promotion_expiry_date: null,
      created_at: now,
      updated_at: now,
    };
    listings.unshift(listing);
    const out = listingOut(listing);
    if (idemKey) idempotency.set(`listing:${idemKey}`, out);
    return ok(out, 201);
  }

  const listingMatch = path.match(/^\/api\/listings\/([^/]+)(\/promote)?$/);
  if (listingMatch) {
    const listing = listings.find((l) => l.id === decodeURIComponent(listingMatch[1]));
    const isPromote = Boolean(listingMatch[2]);

    if (method === 'GET' && !isPromote) return listing ? ok(listingOut(listing)) : notFound();

    if (!user) return unauthorized();
    if (!listing) return notFound();
    if (user.role !== 'seller' || listing.seller_id !== user.id) return forbidden();

    if (method === 'PATCH' && !isPromote) {
      const status = body.status;
      if (status !== 'active' && status !== 'suspended')
        return invalid('status', 'Input should be active or suspended');
      if (listing.status === 'sold_out') {
        return fail(409, 'INVALID_STATUS_TRANSITION', 'لا يمكن تغيير حالة عرض نفدت كميته');
      }
      listing.status = status;
      listing.updated_at = iso(Date.now());
      return ok(listingOut(listing));
    }

    if (method === 'POST' && isPromote) {
      if (listing.status !== 'active') return notActive();
      listing.is_promoted = true;
      listing.promotion_expiry_date = iso(Date.now() + MOCK_CONFIG.promotion_duration_days * DAY_MS);
      listing.updated_at = iso(Date.now());
      return ok({
        listing: listingOut(listing),
        payment: {
          status: 'succeeded',
          payment_ref: uuid(),
          amount_iqd: MOCK_CONFIG.promotion_fee_iqd,
          purpose: 'listing_promotion',
        },
      } satisfies W.PromoteOut);
    }
    return fail(405, 'METHOD_NOT_ALLOWED', 'الطريقة غير مسموحة');
  }

  // ---- AI Engine (investor) ------------------------------------------------
  if (method === 'POST' && path === '/api/ai/match') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const budget = D(String(body.budget_iqd ?? '0'));
    if (!budget.gt(0)) return invalid('budget_iqd', 'Input should be greater than 0');
    const results = matchResults(user.risk_profile ?? 'medium', budget, user.id);
    return ok({
      budget_iqd: m2(budget).replace(/\.00$/, ''),
      risk_profile: user.risk_profile ?? 'medium',
      engine: 'rules',
      message: results.length ? `وجدنا ${results.length} عروض مناسبة لميزانيتك` : NO_MATCH,
      results,
    } satisfies W.MatchOut);
  }

  // Same rules as the server (API_CONTRACT AI Advisor): the mock always answers with "rules"
  if (method === 'POST' && path === '/api/ai/advisor') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const question = String(body.question ?? '').trim();
    if (!question || question.length > 500) return invalid('question', 'question must be 1 to 500 characters');
    const profile = user.risk_profile ?? 'medium';

    let budget: W.AdvisorOut['budget'] = null;
    if (body.budget_iqd !== undefined && body.budget_iqd !== null) {
      const amount = D(String(body.budget_iqd));
      if (!amount.gt(0)) return invalid('budget_iqd', 'Input should be greater than 0');
      budget = { amount_iqd: amount.toString(), source: 'request', confirmed: true };
    } else {
      const guess = parseAdvisorBudget(question);
      if (guess) budget = { ...guess, confirmed: guess.source === 'question_digits' };
    }
    const suggestions = budget?.confirmed ? matchResults(profile, D(budget.amount_iqd), user.id) : [];

    const moneyTopic = budget !== null || MONEY_TOPIC.test(question.replace(/[أإآ]/g, 'ا'));
    const state = advisorState(moneyTopic, budget, suggestions);
    return ok({
      engine: 'rules',
      answer: advisorAnswer(state, profile, budget, suggestions),
      show_figures: moneyTopic,
      budget,
      holdings_grams: g3((ownership.get(user.id)?.grams ?? D(0)).toString()),
      suggestions,
      market_snapshot: {
        price_24k_per_gram: m2(live24()),
        change_24h_pct: m2(change24hPct()),
        updated_at: iso(lastUpdated),
        is_stale: false,
      },
      follow_up_questions: ADVISOR_FOLLOW_UPS[state],
      disclaimer: ADVISOR_DISCLAIMER,
    } satisfies W.AdvisorOut);
  }

  if (method === 'POST' && path === '/api/ai/risk-analysis') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const listing = listings.find((l) => l.id === body.asset_id);
    if (!listing) return notFound();
    return ok({
      ...riskInsight(),
      asset_id: listing.id,
      purchased_weight_grams: g3(String(body.weight_grams ?? '0')),
    } satisfies W.RiskAnalysisOut);
  }

  if (method === 'GET' && path === '/api/ai/insights') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    if (!isPremiumActive(user)) return fail(403, 'SUBSCRIPTION_REQUIRED', 'هذه الميزة متاحة لمشتركي Premium فقط');

    const now = Date.now();
    const p24 = live24();
    const pct = (then: Decimal) => p24.minus(then).div(then).times(100);
    const week = Array.from({ length: 7 * 24 }, (_, i) => price24At(now - i * 3_600_000));
    const change7 = pct(price24At(now - 7 * DAY_MS));
    const trend = change7.gt(0.5) ? 'up' : change7.lt(-0.5) ? 'down' : 'flat';
    const trendWord = { up: 'صاعد', down: 'هابط', flat: 'مستقر' }[trend];

    const mine = transactions.filter((t) => t.investor_id === user.id);
    const byKarat = VALID_KARATS.map((k) => {
      const grams = mine.filter((t) => t.karat === k).reduce((s, t) => s.plus(t.grams), D(0));
      return { karat: k, grams, value: grams.times(karatPriceNow(k)).toDecimalPlaces(2) };
    }).filter((k) => k.grams.gt(0));
    const paid = mine.reduce((s, t) => s.plus(t.principal), D(0));
    const value = byKarat.reduce((s, k) => s.plus(k.value), D(0));
    const pnl = value.minus(paid);
    const pnlPct = paid.gt(0) ? pnl.div(paid).times(100) : null;
    const change24 = change24hPct();

    const alerts: string[] = [];
    if (change24.abs().gte(1)) {
      alerts.push(`تنبيه: الذهب ${change24.gte(0) ? 'ارتفع' : 'انخفض'} ${change24.abs().toFixed(2)}% خلال 24 ساعة.`);
    }
    if (pnlPct) {
      alerts.push(`محفظتك بحالة ${pnl.gte(0) ? 'ربح' : 'خسارة'} غير محقق بنسبة ${pnlPct.abs().toFixed(2)}%.`);
    }

    return ok({
      engine: 'rules',
      alerts,
      market: {
        price_24k_per_gram: m2(p24),
        change_24h_pct: m2(change24),
        change_7d_pct: m2(change7),
        change_30d_pct: m2(pct(price24At(now - 30 * DAY_MS))),
        high_7d: m2(Decimal.max(...week)),
        low_7d: m2(Decimal.min(...week)),
        trend,
        summary: `اتجاه الذهب خلال الأسبوع ${trendWord} (${change7.toFixed(2)}%).`,
      },
      portfolio: {
        total_grams: g3(byKarat.reduce((s, k) => s.plus(k.grams), D(0))),
        total_paid_iqd: m2(paid),
        current_value_iqd: m2(value),
        unrealized_pnl_iqd: m2(pnl),
        unrealized_pnl_pct: pnlPct === null ? null : m2(pnlPct),
        transactions_count: mine.length,
        by_karat: byKarat.map((k) => ({ karat: k.karat, grams: g3(k.grams), current_value_iqd: m2(k.value) })),
      },
    } satisfies W.InsightsOut);
  }

  // ---- Order & Transaction -------------------------------------------------
  if (method === 'POST' && path === '/api/transactions/preview') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const listing = listings.find((l) => l.id === body.asset_id);
    if (!listing) return notFound();
    if (listing.seller_id === user.id) return fail(403, 'FORBIDDEN', 'هذا عرضك، ما تكدر تشتري منه');
    if (listing.status !== 'active') return notActive();
    const grams = D(String(body.purchased_weight_grams ?? '0')).toDecimalPlaces(3, Decimal.ROUND_DOWN);
    if (!grams.gt(0)) return invalid('purchased_weight_grams', 'Input should be greater than 0');
    if (grams.gt(listing.available)) {
      return fail(409, 'INSUFFICIENT_AVAILABLE_WEIGHT', `الكمية المتاحة حالياً ${g3(listing.available)} غرام`);
    }
    const price = karatPriceNow(listing.karat);
    const b = breakdown(grams, price);
    const quotedAt = Date.now();
    const expires = quotedAt + MOCK_CONFIG.quote_ttl_seconds * 1000;
    return ok({
      asset_id: listing.id,
      karat: listing.karat,
      purchased_weight_grams: g3(grams),
      execution_price_per_gram: m2(price),
      principal_amount: m2(b.principal),
      commission_rate: r4(b.rate),
      commission_amount: m2(b.commission),
      total_paid_by_investor: m2(b.total),
      price_updated_at: iso(lastUpdated),
      quoted_at: iso(quotedAt),
      quote_expires_at: iso(expires),
      quote_token: encodeQuote({
        asset_id: listing.id,
        investor_id: user.id,
        grams: g3(grams),
        price: m2(price),
        exp: expires,
      }),
      risk_insight: riskInsight(),
      risk_insight_note: null,
    } satisfies W.PreviewOut);
  }

  if (method === 'POST' && path === '/api/transactions/confirm') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    // Same key → the original transaction, 200 (never a double buy)
    const replayKey = idemKey ? `confirm:${user.id}:${idemKey}` : null;
    if (replayKey && idempotency.has(replayKey)) {
      return ok({ ...(idempotency.get(replayKey) as W.ConfirmOut), idempotent_replay: true }, 200);
    }
    if (!user.kyc_verified) return kycRequired();

    const listing = listings.find((l) => l.id === body.asset_id);
    if (!listing) return notFound();
    if (listing.seller_id === user.id) return fail(403, 'FORBIDDEN', 'هذا عرضك، ما تكدر تشتري منه');
    const grams = D(String(body.purchased_weight_grams ?? '0')).toDecimalPlaces(3, Decimal.ROUND_DOWN);
    const quote = decodeQuote(String(body.quote_token ?? ''));
    if (
      !quote ||
      quote.exp < Date.now() ||
      quote.investor_id !== user.id ||
      quote.asset_id !== listing.id ||
      quote.grams !== g3(grams)
    ) {
      return fail(409, 'PRICE_CHANGED', 'تغيّر السعر أو انتهت صلاحية العرض، يرجى المعاينة مجدداً');
    }
    if (listing.status !== 'active') return notActive();
    if (grams.gt(listing.available)) {
      return fail(409, 'INSUFFICIENT_AVAILABLE_WEIGHT', `الكمية المتاحة حالياً ${g3(listing.available)} غرام`);
    }

    // Executed at the QUOTED price: what the user saw is what they pay
    const tx = purchase(user, listing, grams, D(quote.price), Date.now(), true);
    const record = ownership.get(user.id)!;
    const out: W.ConfirmOut = {
      transaction: txOut(tx, user),
      ownership: { total_accumulated_grams: g3(record.grams), updated_at: record.updated_at },
      listing_status: listing.status,
      listing_available_weight_grams: g3(listing.available),
      idempotent_replay: false,
    };
    if (replayKey) idempotency.set(replayKey, out);
    return ok(out, 201);
  }

  if (method === 'GET' && path === '/api/transactions') {
    if (!user) return unauthorized();
    // Bought, or sold from my listing (a seller) or my resale (an investor)
    const own = transactions.filter(
      (t) => t.investor_id === user.id || listings.find((l) => l.id === t.asset_id)?.seller_id === user.id
    );
    return ok(
      page(
        own.map((t) => txOut(t, user)),
        q
      ) satisfies W.PageTransactionOut
    );
  }

  const txMatch = path.match(/^\/api\/transactions\/([^/]+)$/);
  if (method === 'GET' && txMatch) {
    if (!user) return unauthorized();
    const tx = transactions.find((t) => t.id === decodeURIComponent(txMatch[1]));
    const isParty =
      tx && (tx.investor_id === user.id || listings.find((l) => l.id === tx.asset_id)?.seller_id === user.id);
    // Other people's transactions are 404, not 403 (contract §2)
    return tx && isParty ? ok(txOut(tx, user)) : notFound();
  }

  // ---- Subscription (investor) ---------------------------------------------
  const subscriptionOut = (u: UserRec): W.SubscriptionStatusOut => {
    const active = isPremiumActive(u);
    const left = active ? Math.ceil((new Date(u.subscription_expiry_date!).getTime() - Date.now()) / DAY_MS) : 0;
    return {
      subscription_tier: active ? 'premium' : 'free',
      subscription_expiry_date: u.subscription_expiry_date,
      is_active: active,
      days_remaining: left,
      price_iqd: MOCK_CONFIG.subscription_price_iqd,
      duration_days: MOCK_CONFIG.subscription_duration_days,
    };
  };

  if (method === 'POST' && path === '/api/subscription/subscribe') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    // Renewing early extends from the current expiry; otherwise from now
    const base = isPremiumActive(user) ? new Date(user.subscription_expiry_date!).getTime() : Date.now();
    user.subscription_expiry_date = iso(base + MOCK_CONFIG.subscription_duration_days * DAY_MS);
    user.subscription_tier = 'premium';
    return ok({
      ...subscriptionOut(user),
      payment: {
        status: 'succeeded',
        payment_ref: uuid(),
        amount_iqd: MOCK_CONFIG.subscription_price_iqd,
        purpose: 'premium_subscription',
      },
    } satisfies W.SubscribeOut);
  }

  if (method === 'GET' && path === '/api/subscription/status') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    return ok(subscriptionOut(user));
  }

  // ---- Ownership (investor) --------------------------------------------------
  if (method === 'GET' && path === '/api/ownership/me') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    if (readSetting('sila-mock-integrity-fail') === '1') {
      return fail(403, 'INTEGRITY_CHECK_FAILED', 'تعذّر التحقق من سلامة رصيدك');
    }
    const record = ownership.get(user.id);
    const grams = record?.grams ?? D(0);
    return ok({
      investor_id: user.id,
      total_accumulated_grams: g3(grams),
      verified: true,
      digital_signature_token: record ? signature(`${user.id}|${g3(grams)}|${record.updated_at}`) : null,
      updated_at: record?.updated_at ?? null,
      message: record ? null : 'ابدأ أول استثمار',
      disclaimer: OWNERSHIP_DISCLAIMER,
      by_karat: VALID_KARATS.map((k) => {
        const owned = holdingsByKarat(user.id).get(k)!;
        const reserved = reservedByKarat(user.id).get(k)!;
        return {
          karat: k,
          owned_grams: g3(owned),
          reserved_grams: g3(reserved),
          available_to_resell_grams: g3(Decimal.max(owned.minus(reserved), 0)),
        };
      }).filter((b) => D(b.owned_grams).gt(0) || D(b.reserved_grams).gt(0)),
    } satisfies W.OwnershipOut);
  }

  // ---- Investor resale (Workflow 09) -----------------------------------------
  if (path === '/api/ownership/resale' && method === 'POST') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const key = idemKey ? `resale:${user.id}:${idemKey}` : null;
    if (key && idempotency.has(key)) return ok(idempotency.get(key), 200);
    if (!user.kyc_verified) return fail(403, 'KYC_NOT_VERIFIED', 'يجب توثيق حسابك قبل عرض ذهبك للبيع');
    const karat = Number(body.karat) as Karat;
    if (!VALID_KARATS.includes(karat)) return invalid('karat', 'Input should be 18, 21, 22 or 24');
    const grams = D(String(body.weight_grams ?? '0')).toDecimalPlaces(3, Decimal.ROUND_DOWN);
    if (!grams.gt(0)) return invalid('weight_grams', 'Input should be greater than 0');
    const available = holdingsByKarat(user.id).get(karat)!.minus(reservedByKarat(user.id).get(karat)!);
    if (grams.gt(available)) {
      return fail(409, 'INSUFFICIENT_HOLDINGS', `المتاح للبيع من عيار ${karat}: ${g3(Decimal.max(available, 0))} غرام`);
    }
    const now = iso(Date.now());
    const listing: ListingRec = {
      id: uuid(),
      seller_id: user.id,
      karat,
      listing_type: 'investor_resale',
      total: grams,
      available: grams,
      base_price: karatPriceNow(karat),
      status: 'active',
      is_promoted: false,
      promotion_expiry_date: null,
      created_at: now,
      updated_at: now,
    };
    listings.unshift(listing);
    audit('resale_listed', user.id, 'asset_listing', listing.id, { karat, grams: g3(grams) });
    const out = listingOut(listing);
    if (key) idempotency.set(key, out);
    return ok(out, 201);
  }

  if (path === '/api/ownership/resale' && method === 'GET') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const open = (l: ListingRec) => (l.status === 'active' || l.status === 'suspended' ? 0 : 1);
    return ok(
      listings
        .filter((l) => l.listing_type === 'investor_resale' && l.seller_id === user.id)
        .sort((a, b) => open(a) - open(b) || b.created_at.localeCompare(a.created_at))
        .map(listingOut)
    );
  }

  const resaleMatch = path.match(/^\/api\/ownership\/resale\/([^/]+)$/);
  if (resaleMatch && method === 'PATCH') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    const listing = listings.find((l) => l.id === decodeURIComponent(resaleMatch[1]));
    if (!listing || listing.seller_id !== user.id || listing.listing_type !== 'investor_resale') {
      return fail(403, 'FORBIDDEN', 'هذا العرض مو من عروض إعادة البيع مالتك');
    }
    const status = String(body.status);
    if (!['active', 'suspended', 'withdrawn'].includes(status)) {
      return invalid('status', 'Input should be active, suspended or withdrawn');
    }
    if (listing.status === 'sold_out' || listing.status === 'withdrawn') {
      return fail(409, 'INVALID_STATUS_TRANSITION', 'العرض منتهي ولا يمكن تغيير حالته');
    }
    listing.status = status as ListingStatus;
    listing.updated_at = iso(Date.now());
    return ok(listingOut(listing));
  }

  // ---- Notifications (any signed-in user) ------------------------------------
  const notificationsOut = (u: UserRec): W.NotificationsOut => {
    const mine = notificationsStore.filter((n) => n.user_id === u.id);
    return {
      items: mine.slice(0, 20).map(({ user_id: _owner, ...n }) => n),
      unread_count: mine.filter((n) => !n.read).length,
    };
  };

  if (method === 'GET' && path === '/api/notifications') {
    if (!user) return unauthorized();
    return ok(notificationsOut(user));
  }

  if (method === 'POST' && path === '/api/notifications/read') {
    if (!user) return unauthorized();
    const ids = Array.isArray(body.ids) && body.ids.length ? (body.ids as string[]) : null;
    for (const n of notificationsStore) {
      if (n.user_id === user.id && (!ids || ids.includes(n.id))) n.read = true;
    }
    return ok(notificationsOut(user));
  }

  // ---- Price alerts (Premium) ---------------------------------------------------
  const alertOut = (a: AlertRec): W.AlertOut => ({
    id: a.id,
    karat: a.karat,
    direction: a.direction,
    target_price_per_gram: m2(a.target),
    status: a.status,
    triggered_at: a.triggered_at,
    created_at: a.created_at,
  });

  if (path === '/api/alerts' && method === 'GET') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    return ok(alertsStore.filter((a) => a.user_id === user.id).map(alertOut));
  }

  if (path === '/api/alerts' && method === 'POST') {
    if (!user) return unauthorized();
    if (user.role !== 'investor') return forbidden();
    if (!isPremiumActive(user)) return fail(403, 'SUBSCRIPTION_REQUIRED', 'تنبيهات الأسعار متاحة لمشتركي Premium');
    const karat = Number(body.karat) as Karat;
    const direction = body.direction === 'below' ? 'below' : 'above';
    const target = D(String(body.target_price_per_gram ?? '0'));
    if (!VALID_KARATS.includes(karat)) return invalid('karat', 'Input should be 18, 21, 22 or 24');
    if (!target.gt(0)) return invalid('target_price_per_gram', 'Input should be greater than 0');
    const now = karatPriceNow(karat);
    if (direction === 'above' && target.lte(now)) {
      return fail(422, 'VALIDATION_ERROR', 'السعر الحالي أعلى من هدفك، اختار سعر أعلى منه');
    }
    if (direction === 'below' && target.gte(now)) {
      return fail(422, 'VALIDATION_ERROR', 'السعر الحالي أقل من هدفك، اختار سعر أقل منه');
    }
    const active = alertsStore.filter((a) => a.user_id === user.id && a.status === 'active').length;
    if (active >= 10) return fail(422, 'VALIDATION_ERROR', 'الحد الأعلى 10 تنبيهات فعّالة');
    const alert: AlertRec = {
      id: uuid(),
      user_id: user.id,
      karat,
      direction,
      target,
      status: 'active',
      triggered_at: null,
      created_at: iso(Date.now()),
    };
    alertsStore.unshift(alert);
    return ok(alertOut(alert), 201);
  }

  const alertMatch = path.match(/^\/api\/alerts\/([^/]+)$/);
  if (alertMatch && method === 'PATCH') {
    if (!user) return unauthorized();
    const alert = alertsStore.find((a) => a.id === decodeURIComponent(alertMatch[1]) && a.user_id === user.id);
    if (!alert) return fail(404, 'NOT_FOUND', 'التنبيه غير موجود');
    if (alert.status === 'active') alert.status = 'cancelled';
    return ok(alertOut(alert));
  }

  // ---- Coming soon (public) -------------------------------------------------------
  if (method === 'POST' && path === '/api/interest') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const assetClass = body.asset_class;
    if (!/^\S+@\S+\.\S+$/.test(email)) return invalid('email', 'value is not a valid email address');
    if (assetClass !== 'real_estate' && assetClass !== 'oil')
      return invalid('asset_class', 'Input should be real_estate or oil');
    if (!interestStore.some((i) => i.email === email && i.asset_class === assetClass)) {
      interestStore.unshift({ email, asset_class: assetClass, created_at: iso(Date.now()) });
    }
    const thanks =
      assetClass === 'real_estate'
        ? 'تم تسجيل اهتمامك بالعقارات، راح نبلغك أول ما تتوفر على صِلة.'
        : 'تم تسجيل اهتمامك بالنفط، راح نبلغك أول ما يتوفر على صِلة.';
    return ok({ message: thanks } satisfies W.InterestReplyOut, 202);
  }

  // ---- Administration (admin only) ------------------------------------------------
  if (path.startsWith('/api/admin/')) {
    if (!user) return unauthorized();
    if (user.role !== 'admin') return fail(403, 'FORBIDDEN', 'هذه العملية متاحة لإدارة المنصة فقط');

    const adminUserOut = (u: UserRec): W.AdminUserOut => ({
      id: u.id,
      role: u.role,
      full_name: u.full_name,
      email: u.email,
      kyc_verified: u.kyc_verified,
      is_active: u.is_active,
      is_premium_active: isPremiumActive(u),
      must_change_password: u.must_change_password,
      created_at: u.created_at,
    });
    const target = (id: string) => {
      const u = users.find((x) => x.id === decodeURIComponent(id));
      if (!u) return { error: notFound() };
      if (u.role === 'admin') return { error: fail(403, 'FORBIDDEN', 'ما تكدر تعدّل حساب مدير من هنا') };
      return { u };
    };

    if (method === 'GET' && path === '/api/admin/overview') {
      const active = listings.filter((l) => l.status === 'active');
      return ok({
        investors: users.filter((u) => u.role === 'investor').length,
        sellers: users.filter((u) => u.role === 'seller').length,
        inactive_accounts: users.filter((u) => !u.is_active).length,
        premium_active: users.filter(isPremiumActive).length,
        active_listings: active.length,
        active_resale_listings: active.filter((l) => l.listing_type === 'investor_resale').length,
        transactions: transactions.length,
        volume_iqd: m2(transactions.reduce((sum, t) => sum.plus(t.total), D(0))),
        commission_iqd: m2(transactions.reduce((sum, t) => sum.plus(t.commission), D(0))),
        pending_password_requests: resetRequests.filter((r) => r.status === 'pending').length,
        interest: {
          real_estate: interestStore.filter((i) => i.asset_class === 'real_estate').length,
          oil: interestStore.filter((i) => i.asset_class === 'oil').length,
        },
      } satisfies W.OverviewOut);
    }

    if (method === 'GET' && path === '/api/admin/users') {
      const term = (q.get('q') ?? '').trim().toLowerCase();
      const role = q.get('role');
      const found = users
        .filter((u) => !term || u.email.includes(term) || u.full_name.toLowerCase().includes(term))
        .filter((u) => !role || u.role === role)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return ok(page(found.map(adminUserOut), q) satisfies W.PageAdminUserOut);
    }

    const resetMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
    if (method === 'POST' && resetMatch) {
      const { u, error } = target(resetMatch[1]);
      if (error) return error;
      const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      const temporary = Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join(
        ''
      );
      u!.password = temporary;
      u!.must_change_password = true;
      u!.pwv = Date.now();
      for (const r of resetRequests) {
        if (r.status === 'pending' && (r.user_id === u!.id || r.email === u!.email)) {
          r.status = 'resolved';
          r.resolved_at = iso(Date.now());
        }
      }
      audit('admin_password_reset', user.id, 'user', u!.id);
      notify(
        u!.id,
        'password_reset',
        'كلمة سر جديدة',
        'إدارة صِلة أصدرت إلك كلمة سر مؤقتة. غيّرها أول ما تدخل.',
        '/app/settings'
      );
      return ok({ user: adminUserOut(u!), temporary_password: temporary } satisfies W.TempPasswordOut);
    }

    const userMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
    if (method === 'PATCH' && userMatch) {
      const { u, error } = target(userMatch[1]);
      if (error) return error;
      if (typeof body.is_active === 'boolean' && body.is_active !== u!.is_active) {
        u!.is_active = body.is_active;
        if (!body.is_active) {
          for (const l of listings) if (l.seller_id === u!.id && l.status === 'active') l.status = 'suspended';
        }
        audit('admin_user_updated', user.id, 'user', u!.id, { is_active: body.is_active });
      }
      if (typeof body.kyc_verified === 'boolean') u!.kyc_verified = body.kyc_verified;
      return ok(adminUserOut(u!));
    }

    if (method === 'GET' && path === '/api/admin/listings') {
      const status = q.get('status');
      const type = q.get('listing_type');
      const found = listings
        .filter((l) => (!status || l.status === status) && (!type || l.listing_type === type))
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      return ok(page(found.map(listingOut), q) satisfies W.PageListingOut);
    }

    const adminListingMatch = path.match(/^\/api\/admin\/listings\/([^/]+)$/);
    if (method === 'PATCH' && adminListingMatch) {
      const listing = listings.find((l) => l.id === decodeURIComponent(adminListingMatch[1]));
      if (!listing) return notFound();
      if (listing.status === 'sold_out' || listing.status === 'withdrawn') {
        return fail(409, 'INVALID_STATUS_TRANSITION', 'العرض منتهي ولا يمكن تغيير حالته');
      }
      const status = body.status === 'suspended' ? 'suspended' : 'active';
      if (listing.status !== status) {
        listing.status = status;
        audit('admin_listing_moderated', user.id, 'asset_listing', listing.id, { to: status });
        if (status === 'suspended') {
          notify(
            listing.seller_id,
            'listing_suspended',
            'تم إيقاف عرض',
            `إدارة صِلة أوقفت عرضك من عيار ${listing.karat} مؤقتاً.`,
            listing.listing_type === 'investor_resale' ? '/app/portfolio' : '/app/listings'
          );
        }
      }
      return ok(listingOut(listing));
    }

    const resetOut = (r: ResetRec): W.ResetRequestOut => ({
      ...r,
      user_name: users.find((u) => u.id === r.user_id)?.full_name ?? null,
    });

    if (method === 'GET' && path === '/api/admin/password-requests') {
      const status = q.get('status') ?? 'pending';
      return ok(resetRequests.filter((r) => r.status === status).map(resetOut));
    }

    const requestMatch = path.match(/^\/api\/admin\/password-requests\/([^/]+)$/);
    if (method === 'PATCH' && requestMatch) {
      const r = resetRequests.find((x) => x.id === decodeURIComponent(requestMatch[1]));
      if (!r) return notFound();
      if (r.status === 'pending') {
        r.status = 'dismissed';
        r.resolved_at = iso(Date.now());
      }
      return ok(resetOut(r));
    }

    if (method === 'GET' && path === '/api/admin/audit') {
      const type = q.get('event_type');
      return ok(
        page(
          auditLog.filter((e) => !type || e.event_type === type),
          q
        ) satisfies W.PageAuditOut
      );
    }

    if (method === 'GET' && path === '/api/admin/interest') return ok(interestStore);

    return notFound();
  }

  // ---- System ------------------------------------------------------------------
  if (method === 'GET' && path === '/api/config') return ok(MOCK_CONFIG satisfies W.PublicConfigOut);

  if (method === 'GET' && path === '/api/health') {
    return ok({
      status: 'ok',
      database: 'ok',
      price_cache_age_seconds: Math.round((Date.now() - lastUpdated) / 1000),
      price_source: 'mock',
      price_is_stale: false,
      time: iso(Date.now()),
    } satisfies W.HealthOut);
  }

  return notFound();
};
