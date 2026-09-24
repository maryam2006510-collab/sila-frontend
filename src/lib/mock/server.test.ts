// @vitest-environment node
// The mock speaks API_CONTRACT.md: these tests pin the contract's rules so mock mode and the real
// backend stay interchangeable (formats, error codes, quotes, idempotency, roles, KYC, premium).
import { describe, it, expect, beforeAll } from 'vitest';
import { mockTransport } from './server';
import { DEMO_PASSWORD, SEED_LISTINGS } from './data';

type Body = Record<string, unknown>;

const call = async (
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; headers?: Record<string, string> } = {}
) => {
  const headers: Record<string, string> = { ...opts.headers };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await mockTransport({ method, path, headers, body: opts.body });
  return { status: res.status, body: res.body as Body };
};

const login = async (email: string) => {
  const res = await call('POST', '/api/auth/login', { body: { email, password: DEMO_PASSWORD } });
  expect(res.status).toBe(200);
  return res.body.access_token as string;
};

const GRAMS = /^\d+\.\d{3}$/;
const MONEY = /^-?\d+\.\d{2}$/;
const RATE = /^\d\.\d{4}$/;

let zainab: string; // KYC verified, Premium, holdings
let ali: string; // not KYC-verified, free
let karrada: string; // seller, KYC verified
let mansour: string; // seller, not KYC-verified
let bigListingId: string;

beforeAll(async () => {
  [zainab, ali, karrada, mansour] = await Promise.all([
    login('zainab@sila.iq'),
    login('ali@sila.iq'),
    login('karrada@sila.iq'),
    login('mansour@sila.iq'),
  ]);
  // A 500 g listing so every commission tier can be quoted
  const created = await call('POST', '/api/listings', {
    token: karrada,
    body: { total_weight_grams: '500.000', karat: 24 },
    headers: { 'Idempotency-Key': 'seed-big' },
  });
  expect(created.status).toBe(201);
  bigListingId = created.body.id as string;
});

describe('identity (contract §3)', () => {
  it('returns INVALID_CREDENTIALS with the Arabic message for a wrong password', async () => {
    const res = await call('POST', '/api/auth/login', { body: { email: 'karrada@sila.iq', password: 'nope-nope' } });
    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ error_code: 'INVALID_CREDENTIALS', status: 401 });
    expect(typeof res.body.message).toBe('string');
  });

  it('logs in with tokens, expires_in and the user (with is_premium_active)', async () => {
    const res = await call('POST', '/api/auth/login', { body: { email: 'zainab@sila.iq', password: DEMO_PASSWORD } });
    expect(res.body).toMatchObject({ token_type: 'bearer', expires_in: 900 });
    expect(res.body.user).toMatchObject({ role: 'investor', is_premium_active: true, kyc_verified: true });
  });

  it('signs up with 201 and the profile only (no tokens)', async () => {
    const res = await call('POST', '/api/auth/signup', {
      body: { role: 'seller', full_name: 'صاغة الأعظمية', email: 'adhamiya@sila.iq', password: 'longenough1' },
    });
    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeUndefined();
    expect(res.body).toMatchObject({ email: 'adhamiya@sila.iq', kyc_verified: false, is_premium_active: false });
  });

  it('rejects a duplicate email with 409 EMAIL_ALREADY_EXISTS', async () => {
    const res = await call('POST', '/api/auth/signup', {
      body: { role: 'seller', full_name: 'Test', email: 'karrada@sila.iq', password: 'longenough1' },
    });
    expect(res.status).toBe(409);
    expect(res.body.error_code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('points a VALIDATION_ERROR at its field through details', async () => {
    const res = await call('POST', '/api/auth/signup', {
      body: { role: 'investor', full_name: 'Test', email: 'new@sila.iq', password: 'longenough1' },
    });
    expect(res.status).toBe(422);
    expect(res.body.error_code).toBe('VALIDATION_ERROR');
    expect(res.body.details).toEqual([expect.objectContaining({ field: 'risk_profile' })]);
  });
});

describe('formats (contract §1)', () => {
  it('pages listings and sends money and weights as decimal strings', async () => {
    const res = await call('GET', '/api/listings?limit=2&offset=0');
    expect(res.body).toMatchObject({ limit: 2, offset: 0 });
    const items = res.body.items as Body[];
    expect(items).toHaveLength(2);
    expect(res.body.total).toBeGreaterThan(2);
    expect(items[0].available_weight_grams).toMatch(GRAMS);
    expect(items[0].base_price_per_gram).toMatch(MONEY);
    expect(items[0].current_price_per_gram).toMatch(MONEY);
  });

  it('lists only active listings publicly, every status for the owner', async () => {
    const pub = (await call('GET', '/api/listings?limit=100')).body.items as Body[];
    expect(pub.every((l) => l.status === 'active')).toBe(true);
    const nahr = await login('nahr@sila.iq');
    const mine = (await call('GET', '/api/listings?seller_id=me&limit=100', { token: nahr })).body.items as Body[];
    expect(mine.map((l) => l.status).sort()).toEqual(['active', 'active', 'sold_out', 'suspended']);
  });

  it('serves price history per karat and range', async () => {
    const res = await call('GET', '/api/market/prices/history?karat=21&range=1W');
    const points = res.body.points as Body[];
    expect(res.body).toMatchObject({ karat: 21, range: '1W', currency: 'IQD' });
    expect(points.length).toBeGreaterThan(100);
    expect(points[0].price_per_gram).toMatch(MONEY);
  });

  it('exposes the config: tiers, fees and the 60 s quote TTL', async () => {
    const res = await call('GET', '/api/config');
    expect(res.body).toMatchObject({
      quote_ttl_seconds: 60,
      promotion_fee_iqd: '25000',
      subscription_duration_days: 30,
    });
  });
});

describe('checkout (contract §5)', () => {
  const listing = SEED_LISTINGS[3].id; // 22K, active

  it('quotes a purchase with the server tiers (49.999 → 1.5%, 50 → 1.0%, 200.001 → 0.5%)', async () => {
    const rate = async (grams: string) =>
      (
        await call('POST', '/api/transactions/preview', {
          token: zainab,
          body: { asset_id: bigListingId, purchased_weight_grams: grams },
        })
      ).body.commission_rate;
    expect(await rate('49.999')).toBe('0.0150');
    expect(await rate('50.000')).toBe('0.0100');
    expect(await rate('200.001')).toBe('0.0050');
  });

  it('returns a quote token valid for 60 s and a risk insight', async () => {
    const res = await call('POST', '/api/transactions/preview', {
      token: ali,
      body: { asset_id: listing, purchased_weight_grams: '2.500' },
    });
    expect(res.status).toBe(200);
    expect(res.body.commission_rate).toMatch(RATE);
    const ttl =
      new Date(res.body.quote_expires_at as string).getTime() - new Date(res.body.quoted_at as string).getTime();
    expect(ttl).toBe(60_000);
    expect(res.body.quote_token).toEqual(expect.any(String));
    expect(res.body.risk_insight).toMatchObject({ engine: 'rules' });
  });

  it('blocks confirm with KYC_NOT_VERIFIED, then the SAME key succeeds once verified', async () => {
    const quote = (
      await call('POST', '/api/transactions/preview', {
        token: ali,
        body: { asset_id: listing, purchased_weight_grams: '2.500' },
      })
    ).body;
    const confirm = () =>
      call('POST', '/api/transactions/confirm', {
        token: ali,
        headers: { 'Idempotency-Key': 'ali-1' },
        body: { asset_id: listing, purchased_weight_grams: '2.500', quote_token: quote.quote_token },
      });

    const blocked = await confirm();
    expect(blocked.status).toBe(403);
    expect(blocked.body.error_code).toBe('KYC_NOT_VERIFIED');

    const kyc = await call('POST', '/api/kyc/verify', { token: ali });
    expect(kyc.body).toMatchObject({ kyc_verified: true, user: expect.objectContaining({ kyc_verified: true }) });

    const first = await confirm();
    expect(first.status).toBe(201);
    expect((first.body.ownership as Body).total_accumulated_grams).toBe('2.500');

    // A resend with the same key returns the original transaction: 200, never a second buy
    const replay = await confirm();
    expect(replay.status).toBe(200);
    expect(replay.body.idempotent_replay).toBe(true);
    expect((replay.body.transaction as Body).id).toBe((first.body.transaction as Body).id);
    const own = await call('GET', '/api/ownership/me', { token: ali });
    expect(own.body.total_accumulated_grams).toBe('2.500');
  });

  it('answers PRICE_CHANGED when the quote does not match the request', async () => {
    const quote = (
      await call('POST', '/api/transactions/preview', {
        token: zainab,
        body: { asset_id: listing, purchased_weight_grams: '1.000' },
      })
    ).body;
    const res = await call('POST', '/api/transactions/confirm', {
      token: zainab,
      headers: { 'Idempotency-Key': 'z-mismatch' },
      body: { asset_id: listing, purchased_weight_grams: '2.000', quote_token: quote.quote_token },
    });
    expect(res.status).toBe(409);
    expect(res.body.error_code).toBe('PRICE_CHANGED');
  });

  it('turns a fully bought listing into sold_out and refuses further quotes', async () => {
    const available = (await call('GET', `/api/listings/${bigListingId}`)).body.available_weight_grams as string;
    const quote = (
      await call('POST', '/api/transactions/preview', {
        token: zainab,
        body: { asset_id: bigListingId, purchased_weight_grams: available },
      })
    ).body;
    const res = await call('POST', '/api/transactions/confirm', {
      token: zainab,
      headers: { 'Idempotency-Key': 'z-all' },
      body: { asset_id: bigListingId, purchased_weight_grams: available, quote_token: quote.quote_token },
    });
    expect(res.body.listing_status).toBe('sold_out');
    const after = await call('POST', '/api/transactions/preview', {
      token: zainab,
      body: { asset_id: bigListingId, purchased_weight_grams: '1.000' },
    });
    expect(after.body.error_code).toBe('LISTING_NOT_ACTIVE');
  });
});

describe('seller (contract §6)', () => {
  it('interrupts publishing with KYC, then the SAME key creates exactly one listing', async () => {
    const publish = () =>
      call('POST', '/api/listings', {
        token: mansour,
        headers: { 'Idempotency-Key': 'mansour-1' },
        body: { total_weight_grams: '40.000', karat: 21 },
      });
    expect((await publish()).body.error_code).toBe('KYC_NOT_VERIFIED');
    await call('POST', '/api/kyc/seller', { token: mansour });
    const created = await publish();
    expect(created.status).toBe(201);
    const replay = await publish();
    expect(replay.status).toBe(200);
    expect(replay.body.id).toBe(created.body.id);
  });

  it('shows sellers a buyer pseudonym, never an identity', async () => {
    const sales = (await call('GET', '/api/transactions?limit=100', { token: karrada })).body.items as Body[];
    expect(sales.length).toBeGreaterThan(0);
    expect(sales.every((t) => typeof t.buyer_ref === 'string' && !String(t.buyer_ref).includes('زينب'))).toBe(true);
  });

  it('hides other people’s transactions behind 404', async () => {
    const mine = (await call('GET', '/api/transactions?limit=1', { token: zainab })).body.items as Body[];
    const res = await call('GET', `/api/transactions/${mine[0].id}`, { token: ali });
    expect(res.status).toBe(404);
  });

  it('refuses a status change on a sold-out listing with INVALID_STATUS_TRANSITION', async () => {
    const nahr = await login('nahr@sila.iq');
    const res = await call('PATCH', `/api/listings/${SEED_LISTINGS[5].id}`, {
      token: nahr,
      body: { status: 'active' },
    });
    expect(res.body.error_code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('promotes with a payment record and the configured length', async () => {
    const res = await call('POST', `/api/listings/${SEED_LISTINGS[7].id}/promote`, { token: karrada });
    expect(res.status).toBe(200);
    expect(res.body.payment).toMatchObject({ amount_iqd: '25000', status: 'succeeded' });
    expect((res.body.listing as Body).is_promoted).toBe(true);
  });
});

describe('premium & ownership', () => {
  const DAY = 86_400_000;

  it('locks insights with SUBSCRIPTION_REQUIRED for a free investor', async () => {
    const res = await call('GET', '/api/ai/insights', { token: ali });
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('subscribes for the configured 30 days, and an early renewal extends from the expiry', async () => {
    const first = await call('POST', '/api/subscription/subscribe', { token: ali });
    expect(first.body).toMatchObject({
      is_active: true,
      subscription_tier: 'premium',
      duration_days: 30,
      price_iqd: '15000',
    });
    const firstExpiry = new Date(first.body.subscription_expiry_date as string).getTime();
    const second = await call('POST', '/api/subscription/subscribe', { token: ali });
    const secondExpiry = new Date(second.body.subscription_expiry_date as string).getTime();
    expect(Math.round((secondExpiry - firstExpiry) / DAY)).toBe(30);
    const insights = await call('GET', '/api/ai/insights', { token: ali });
    expect(insights.status).toBe(200);
    expect(insights.body.market).toMatchObject({ trend: expect.stringMatching(/^(up|down|flat)$/) });
  });

  it('returns the signed balance with the disclaimer, and a first-investment message when empty', async () => {
    const own = await call('GET', '/api/ownership/me', { token: zainab });
    expect(own.body.total_accumulated_grams).toMatch(GRAMS);
    expect(own.body.digital_signature_token).toEqual(expect.any(String));
    expect(String(own.body.disclaimer)).toContain('ليس سند ملكية');

    const signup = await call('POST', '/api/auth/signup', {
      body: {
        role: 'investor',
        full_name: 'جديد',
        email: 'fresh@sila.iq',
        password: 'longenough1',
        risk_profile: 'low',
      },
    });
    expect(signup.status).toBe(201);
    const fresh = (await call('POST', '/api/auth/login', { body: { email: 'fresh@sila.iq', password: 'longenough1' } }))
      .body.access_token as string;
    const empty = await call('GET', '/api/ownership/me', { token: fresh });
    expect(empty.body).toMatchObject({
      total_accumulated_grams: '0.000',
      digital_signature_token: null,
      message: 'ابدأ أول استثمار',
    });
  });

  it('returns copies, so a cached user object never changes under the cache', async () => {
    const haider = await login('haider@sila.iq');
    const before = await call('GET', '/api/users/me', { token: haider });
    before.body.full_name = 'changed locally';
    const after = await call('GET', '/api/users/me', { token: haider });
    expect(after.body.full_name).toBe('حيدر العبيدي');
    expect(after.body).not.toBe(before.body);
  });
});
