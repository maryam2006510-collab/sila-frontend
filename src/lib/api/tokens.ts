// src/lib/api/tokens.ts
// API_CONTRACT.md §3.5: the access token lives in memory, the refresh token in sessionStorage
// (so a reload restores the session, and closing the tab ends it).

const REFRESH_KEY = 'sila_refresh_token';

let accessToken: string | null = null;

const readRefresh = (): string | null => {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
};

const writeRefresh = (token: string | null) => {
  try {
    if (token) sessionStorage.setItem(REFRESH_KEY, token);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch {
    // Storage blocked: session will last until reload
  }
};

let refreshToken: string | null = readRefresh();

export const tokens = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,
  hasSession: () => Boolean(refreshToken),
  set: (access: string, refresh?: string) => {
    accessToken = access;
    if (refresh) {
      refreshToken = refresh;
      writeRefresh(refresh);
    }
  },
  clear: () => {
    accessToken = null;
    refreshToken = null;
    writeRefresh(null);
  },
};
