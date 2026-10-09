// @vitest-environment node
// The integrated platform in mock mode, pinned to the backend's rules (API_CONTRACT.md):
// investor resale (Workflow 09), notifications, Premium price alerts, passwords handled by an
// admin, the admin endpoints and the coming-soon waitlist. Own file: a fresh mock state.
import { describe, it, expect, beforeAll } from 'vitest';
import { mockTransport } from './server';
import { DEMO_PASSWORD } from './data';

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

const login = async (email: string, password = DEMO_PASSWORD) => {
  const res = await call('POST', '/api/auth/login', { body: { email, password } });
  expect(res.status).toBe(200);
  return res.body.access_token as string;
};

const balance22 = async (token: string) => {
  const own = await call('GET', '/api/ownership/me', { token });
  return (own.body.by_karat as Body[]).find((b) => b.karat === 22)!;
};

let zainab: string; // KYC verified, Premium, holds 55.500 g of 22K
let haider: string; // KYC verified investor
let ali: string; // free investor
let admin: string;

beforeAll(async () => {
  [zainab, haider, ali, admin] = await Promise.all([
    login('zainab@sila.iq'),
    login('haider@sila.iq'),
    login('ali@sila.iq'),
    login('admin@sila.iq'),
  ]);
});

describe('investor resale (Workflow 09)', () => {
  let resaleId: string;

  it('re-lists part of a holding at the server price, labelled without the investor name', async () => {
    const res = await call('POST', '/api/ownership/resale', {
      token: zainab,
      body: { karat: 22, weight_grams: '5.000' },
      headers: { 'Idempotency-Key': 'resale-1' },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ listing_type: 'investor_resale', status: 'active', karat: 22 });
    expect(res.body.seller_name).toBe('مستثمر على صِلة');
    resaleId = res.body.id as string;

    expect(await balance22(zainab)).toMatchObject({
      owned_grams: '55.500',
      reserved_grams: '5.000',
      available_to_resell_grams: '50.500',
    });
  });

  it('refuses more than the available grams with INSUFFICIENT_HOLDINGS', async () => {
    const res = await call('POST', '/api/ownership/resale', {
      token: zainab,
      body: { karat: 22, weight_grams: '50.501' },
      headers: { 'Idempotency-Key': 'resale-2' },
    });
    expect(res.status).toBe(409);
    expect(res.body.error_code).toBe('INSUFFICIENT_HOLDINGS');
  });

  it('never lets the owner buy their own offer', async () => {
    const res = await call('POST', '/api/transactions/preview', {
      token: zainab,
      body: { asset_id: resaleId, purchased_weight_grams: '1.000' },
    });
    expect(res.status).toBe(403);
  });

  it('moves the grams to the buyer and records a sell for the reseller, with a notification', async () => {
    const quote = (
      await call('POST', '/api/transactions/preview', {
        token: haider,
        body: { asset_id: resaleId, purchased_weight_grams: '2.000' },
      })
    ).body;
    const bought = await call('POST', '/api/transactions/confirm', {
      token: haider,
      headers: { 'Idempotency-Key': 'haider-resale-1' },
      body: { asset_id: resaleId, purchased_weight_grams: '2.000', quote_token: quote.quote_token },
    });
    expect(bought.status).toBe(201);

    expect(await balance22(zainab)).toMatchObject({ owned_grams: '53.500', reserved_grams: '3.000' });
    const history = (await call('GET', '/api/transactions?limit=100', { token: zainab })).body.items as Body[];
    expect(history.some((tx) => tx.side === 'sell' && tx.purchased_weight_grams === '2.000')).toBe(true);

    const inbox = await call('GET', '/api/notifications', { token: zainab });
    expect((inbox.body.items as Body[]).some((n) => n.kind === 'resale_sold')).toBe(true);
    expect(inbox.body.unread_count).toEqual(expect.any(Number));
  });

  it('withdraws for good: the unsold grams return to the available balance', async () => {
    const res = await call('PATCH', `/api/ownership/resale/${resaleId}`, {
      token: zainab,
      body: { status: 'withdrawn' },
    });
    expect(res.status).toBe(200);
    expect(await balance22(zainab)).toMatchObject({ reserved_grams: '0.000', available_to_resell_grams: '53.500' });
    const again = await call('PATCH', `/api/ownership/resale/${resaleId}`, {
      token: zainab,
      body: { status: 'active' },
    });
    expect(again.status).toBe(409);
  });
});

describe('price alerts (Premium)', () => {
  it('are created by Premium subscribers only', async () => {
    const res = await call('POST', '/api/alerts', {
      token: ali,
      body: { karat: 21, direction: 'above', target_price_per_gram: '99999999.00' },
    });
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('SUBSCRIPTION_REQUIRED');
  });

  it('need a target ahead of the live price', async () => {
    const behind = await call('POST', '/api/alerts', {
      token: zainab,
      body: { karat: 21, direction: 'above', target_price_per_gram: '1.00' },
    });
    expect(behind.status).toBe(422);
    const ahead = await call('POST', '/api/alerts', {
      token: zainab,
      body: { karat: 21, direction: 'above', target_price_per_gram: '99999999.00' },
    });
    expect(ahead.status).toBe(201);
    expect(ahead.body).toMatchObject({ status: 'active', direction: 'above' });
  });
});

describe('passwords and administration', () => {
  it('cannot sign up as an admin', async () => {
    const res = await call('POST', '/api/auth/signup', {
      body: { role: 'admin', full_name: 'x', email: 'x@sila.iq', password: 'longenough1' },
    });
    expect(res.status).toBe(422);
  });

  it('keeps the admin endpoints for admins', async () => {
    expect((await call('GET', '/api/admin/overview', { token: zainab })).status).toBe(403);
    const overview = await call('GET', '/api/admin/overview', { token: admin });
    expect(overview.status).toBe(200);
    expect(overview.body.investors).toEqual(expect.any(Number));
  });

  it('answers "forgot password" the same way for any e-mail', async () => {
    const known = await call('POST', '/api/auth/forgot-password', { body: { email: 'ali@sila.iq' } });
    const unknown = await call('POST', '/api/auth/forgot-password', { body: { email: 'nobody@sila.iq' } });
    expect(known.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    const pending = await call('GET', '/api/admin/password-requests?status=pending', { token: admin });
    expect((pending.body as unknown as Body[]).map((r) => r.email)).toEqual(
      expect.arrayContaining(['ali@sila.iq', 'nobody@sila.iq'])
    );
  });

  it('a temporary password ends every session and must be changed first', async () => {
    const users = await call('GET', '/api/admin/users?q=ali', { token: admin });
    const aliId = (users.body.items as Body[])[0].id as string;
    const reset = await call('POST', `/api/admin/users/${aliId}/reset-password`, { token: admin });
    expect(reset.status).toBe(200);
    const temporary = reset.body.temporary_password as string;
    expect(temporary).toHaveLength(12);

    // The old session stops working at once
    expect((await call('GET', '/api/users/me', { token: ali })).status).toBe(401);

    const fresh = await login('ali@sila.iq', temporary);
    const me = await call('GET', '/api/users/me', { token: fresh });
    expect(me.body.must_change_password).toBe(true);

    const changed = await call('POST', '/api/users/me/password', {
      token: fresh,
      body: { current_password: temporary, new_password: 'NewGold2026' },
    });
    expect(changed.status).toBe(200);
    expect((changed.body.user as Body).must_change_password).toBe(false);
    // The tokens from before the change are revoked; the returned ones work
    expect((await call('GET', '/api/users/me', { token: fresh })).status).toBe(401);
    expect((await call('GET', '/api/users/me', { token: changed.body.access_token as string })).status).toBe(200);
  });

  it('a deactivated account cannot sign in, and admin accounts are not editable', async () => {
    const users = await call('GET', '/api/admin/users?q=haider', { token: admin });
    const haiderId = (users.body.items as Body[])[0].id as string;
    await call('PATCH', `/api/admin/users/${haiderId}`, { token: admin, body: { is_active: false } });
    const res = await call('POST', '/api/auth/login', { body: { email: 'haider@sila.iq', password: DEMO_PASSWORD } });
    expect(res.status).toBe(403);
    expect(res.body.error_code).toBe('ACCOUNT_DISABLED');

    const admins = await call('GET', '/api/admin/users?role=admin', { token: admin });
    const adminId = (admins.body.items as Body[])[0].id as string;
    const edit = await call('PATCH', `/api/admin/users/${adminId}`, { token: admin, body: { is_active: false } });
    expect(edit.status).toBe(403);
  });
});

describe('coming soon', () => {
  it('registers interest once per e-mail and asset, visible to the admin', async () => {
    const first = await call('POST', '/api/interest', { body: { email: 'Visitor@Mail.com', asset_class: 'oil' } });
    const again = await call('POST', '/api/interest', { body: { email: 'visitor@mail.com', asset_class: 'oil' } });
    expect(first.status).toBe(202);
    expect(again.status).toBe(202);
    const list = await call('GET', '/api/admin/interest', { token: admin });
    expect((list.body as unknown as Body[]).filter((s) => s.email === 'visitor@mail.com')).toHaveLength(1);
  });
});
