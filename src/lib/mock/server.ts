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
  created_at: string;
}

interface ListingRec {
  id: string;
  seller_id: string;
  karat: Karat;
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

const purchase = (investor: UserRec, listing: ListingRec, grams: Decimal, price: Decimal, at: number): TxRec => {
  const seller = users.find((u) => u.id === listing.seller_id)!;
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
    seller_name: seller.full_name,
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
  return tx;
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
      created_at: iso(now - 30 * DAY_MS),
    });
  }
  for (const l of SEED_LISTINGS) {
    const seller = users.find((u) => u.email === l.seller_email)!;
    const created = now - l.days_ago * DAY_MS;
    listings.push({
      id: l.id,
      seller_id: seller.id,
      karat: l.karat,
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
  created_at: u.created_at,
});

const listingOut = (l: ListingRec): W.ListingOut => {
  const seller = users.find((u) => u.id === l.seller_id)!;
  return {
    id: l.id,
    seller_id: l.seller_id,
    seller_name: seller.full_name,
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
  seller_name: t.seller_name,
  buyer_ref: viewer.role === 'seller' ? buyerRef(t.investor_id) : null,
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
const accessTokenFor = (userId: string) => `mock-access.${userId}.${uuid().slice(0, 8)}`;
const refreshTokenFor = (userId: string) => `mock-refresh.${userId}.${uuid().slice(0, 8)}`;
const userIdFromToken = (token: string, kind: 'access' | 'refresh') => {
  const [prefix, userId] = token.split('.');
  return prefix === `mock-${kind}` ? userId : null;
};
const tokensFor = (u: UserRec): W.TokenOut => ({
  access_token: accessTokenFor(u.id),
  refresh_token: refreshTokenFor(u.id),
  token_type: 'bearer',
  expires_in: 900,
});

const userFromHeaders = (headers: Record<string, string>): UserRec | null => {
  const auth = headers.Authorization ?? headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const id = userIdFromToken(auth.slice(7), 'access');
  return users.find((u) => u.id === id) ?? null;
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
export const mockTransport = async (req: TransportRequest): Promise<TransportResponse> => {
  ensureTicker();
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
    return ok({ ...tokensFor(account), user: userOut(account) } satisfies W.LoginOut);
  }

  if (method === 'POST' && path === '/api/auth/refresh') {
    const id = userIdFromToken(String(body.refresh_token ?? ''), 'refresh');
    const account = users.find((u) => u.id === id);
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
    const profile = user.risk_profile ?? 'medium';

    const candidates = listings
      .filter((l) => l.status === 'active')
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
      .sort((a, b) => b.score.comparedTo(a.score) || b.usage.comparedTo(a.usage));

    const results: W.MatchOut['results'] = candidates.map((c, i) => ({
      rank: i + 1,
      listing: listingOut(c.l),
      suggested_weight_grams: g3(c.grams),
      execution_price_per_gram: m2(c.price),
      estimated_total_iqd: m2(c.b.total),
      commission_rate: r4(c.b.rate),
      budget_usage_pct: m2(c.usage),
      score: r4(c.score),
      reason: `${karatReason[c.l.karat]}${c.preferred ? ` ويناسب ملف مخاطرة ${riskName[profile]}` : ''}. يمكنك شراء ${g3(c.grams)} غرام بإجمالي ${m2(c.b.total)} دينار (${m2(c.usage)}% من ميزانيتك).`,
    }));

    return ok({
      budget_iqd: m2(budget).replace(/\.00$/, ''),
      risk_profile: profile,
      engine: 'rules',
      message: results.length
        ? `وجدنا ${results.length} عروض مناسبة لميزانيتك`
        : 'ماكو عروض تناسب هذي الميزانية حالياً',
      results,
    } satisfies W.MatchOut);
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
    const tx = purchase(user, listing, grams, D(quote.price), Date.now());
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
    const own =
      user.role === 'investor'
        ? transactions.filter((t) => t.investor_id === user.id)
        : transactions.filter((t) => listings.find((l) => l.id === t.asset_id)?.seller_id === user.id);
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
    } satisfies W.OwnershipOut);
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
