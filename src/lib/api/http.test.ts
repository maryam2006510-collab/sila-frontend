// Request pipeline: 401 → one shared refresh → retry; rejected refresh expires the session;
// network failures surface as NETWORK_ERROR (never a silent fallback to demo data).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { request } from './http';
import { tokens } from './tokens';
import { ApiError } from './errors';
import { useSessionStore } from '../session';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  vi.restoreAllMocks();
  tokens.set('access-old', 'refresh-1');
  useSessionStore.setState({ hasSession: true, expired: false });
});

describe('http request pipeline', () => {
  it('refreshes once for concurrent 401s and retries each request', async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      if (url.endsWith('/api/auth/refresh')) {
        refreshCalls++;
        return json(200, { access_token: 'access-new', refresh_token: 'refresh-2' });
      }
      return auth === 'Bearer access-new'
        ? json(200, { ok: true, url })
        : json(401, { error_code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول', status: 401 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a, b] = await Promise.all([request('GET', '/api/users/me'), request('GET', '/api/transactions')]);

    expect(a).toMatchObject({ ok: true });
    expect(b).toMatchObject({ ok: true });
    expect(refreshCalls).toBe(1);
    expect(tokens.getAccess()).toBe('access-new');
  });

  it('marks the session expired when the refresh token is rejected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/api/auth/refresh')
          ? json(401, {})
          : json(401, { error_code: 'UNAUTHORIZED', message: 'يجب تسجيل الدخول', status: 401 })
      )
    );

    await expect(request('GET', '/api/users/me')).rejects.toMatchObject({ status: 401 });
    expect(useSessionStore.getState().expired).toBe(true);
    expect(tokens.getRefresh()).toBeNull();
  });

  it('turns a network failure into NETWORK_ERROR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))
    );

    const err = (await request('POST', '/api/transactions/confirm', { body: {} }).catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('maps the contract error body, its field details and Retry-After', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/a')
          ? json(403, { error_code: 'KYC_NOT_VERIFIED', message: 'يجب إكمال التوثيق', status: 403 })
          : url.endsWith('/b')
            ? json(422, {
                error_code: 'VALIDATION_ERROR',
                message: 'البيانات المدخلة غير صالحة',
                status: 422,
                details: [{ field: 'password', message: 'String should have at least 8 characters' }],
              })
            : new Response(JSON.stringify({ error_code: 'RATE_LIMITED', message: 'محاولات كثيرة', status: 429 }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '42' },
              })
      )
    );

    await expect(request('GET', '/api/a')).rejects.toMatchObject({
      code: 'KYC_NOT_VERIFIED',
      status: 403,
      message: 'يجب إكمال التوثيق',
    });
    await expect(request('GET', '/api/b')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ field: 'password', message: 'String should have at least 8 characters' }],
    });
    await expect(request('GET', '/api/c', { auth: false })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
      retryAfter: 42,
    });
  });

  it('does not attach a token to public endpoints', async () => {
    const fetchMock = vi.fn(async () => json(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await request('GET', '/api/market/prices', { auth: false });
    const init = (fetchMock.mock.calls[0] as unknown[])[1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });
});
