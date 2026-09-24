// src/lib/api/http.ts
// Single request pipeline: transport (fetch or mock) → 401 → refresh once → retry (contract §3.3).

import { API_BASE_URL, USE_MOCK } from './config';
import { ApiError, toApiError } from './errors';
import { tokens } from './tokens';
import { useSessionStore } from '../session';
import type { TokenOut } from './wire';

export interface TransportRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface TransportResponse {
  status: number;
  body: unknown;
  // Only the headers the client reads (Retry-After)
  headers?: Record<string, string>;
}

export type Transport = (req: TransportRequest) => Promise<TransportResponse>;

const networkError = () => new ApiError(0, 'NETWORK_ERROR', 'تعذّر الاتصال بالخادم.');

const fetchTransport: Transport = async ({ method, path, headers, body }) => {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw networkError();
  }

  const retryAfter = res.headers.get('Retry-After');
  const out = retryAfter ? { 'Retry-After': retryAfter } : undefined;
  if (res.status === 204) return { status: 204, body: null, headers: out };
  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return { status: res.status, body: parsed, headers: out };
};

// The mock layer is loaded lazily so it never ships in a real-backend build path.
let mockTransport: Promise<Transport> | null = null;

const transport: Transport = async (req) => {
  if (USE_MOCK) {
    mockTransport ??= import('../mock/server').then((m) => m.mockTransport);
    return (await mockTransport)(req);
  }
  return fetchTransport(req);
};

type RefreshResult = 'ok' | 'rejected' | 'network';
let refreshing: Promise<RefreshResult> | null = null;

// Single-flight: concurrent 401s share one refresh call.
const refreshAccess = (): Promise<RefreshResult> => {
  const refreshToken = tokens.getRefresh();
  if (!refreshToken) return Promise.resolve('rejected');

  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const res = await transport({
        method: 'POST',
        path: '/api/auth/refresh',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: { refresh_token: refreshToken },
      });
      if (res.status >= 200 && res.status < 300) {
        const b = res.body as TokenOut;
        tokens.set(b.access_token, b.refresh_token);
        return 'ok';
      }
      return 'rejected';
    } catch {
      return 'network';
    } finally {
      refreshing = null;
    }
  })();

  return refreshing;
};

export interface RequestOptions {
  body?: unknown;
  // false for public endpoints (login, signup, prices, browsing, config)
  auth?: boolean;
  headers?: Record<string, string>;
}

// Returns the raw wire body; api/client.ts adapts it to domain types
export async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const auth = opts.auth ?? true;

  const send = () => {
    const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    const access = tokens.getAccess();
    if (auth && access) headers.Authorization = `Bearer ${access}`;
    return transport({ method, path, headers, body: opts.body });
  };

  const handleRefresh = async () => {
    const result = await refreshAccess();
    if (result === 'network') throw networkError();
    if (result === 'rejected') useSessionStore.getState().markExpired();
    return result === 'ok';
  };

  // After a reload only the refresh token exists; restore the access token first.
  if (auth && !tokens.getAccess() && tokens.hasSession()) {
    await handleRefresh();
  }

  let res = await send();

  // 401 UNAUTHORIZED = expired access token: refresh and retry once
  if (res.status === 401 && auth && tokens.hasSession()) {
    if (await handleRefresh()) res = await send();
  }

  if (res.status >= 200 && res.status < 300) return res.body as T;
  const retryAfter = Number(res.headers?.['Retry-After']);
  throw toApiError(res.status, res.body, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null);
}

// Builds "?a=1&b=2" skipping empty values
export const toQuery = (params: Record<string, string | number | undefined | null>): string => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};
