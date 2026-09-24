// src/lib/queries.ts
// Server-state hooks (TanStack Query). Pages read data only through these.

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from './api';
import { useSessionStore } from './session';
import { ChartRange, Karat, ListingFilters, UserRole } from './types';

// Market page size (contract §1: ?limit&offset, max 100)
export const LISTINGS_PAGE = 20;

export const queryKeys = {
  me: ['me'] as const,
  config: ['config'] as const,
  prices: ['market', 'prices'] as const,
  history: (karat: Karat, range: ChartRange) => ['market', 'history', karat, range] as const,
  listings: (filters: ListingFilters) => ['listings', filters] as const,
  myListings: ['listings', 'mine'] as const,
  listing: (id: string) => ['listing', id] as const,
  transactions: ['transactions'] as const,
  transaction: (id: string) => ['transaction', id] as const,
  ownership: ['ownership'] as const,
  subscription: ['subscription'] as const,
  insights: ['ai', 'insights'] as const,
};

export const useMe = () => {
  const hasSession = useSessionStore((s) => s.hasSession);
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: api.getCurrentUser,
    enabled: hasSession,
    staleTime: 60_000,
  });
};

// Fees, commission tiers, subscription price, quote TTL (public). Changes rarely.
export const useServerConfig = () =>
  useQuery({ queryKey: queryKeys.config, queryFn: api.getConfig, staleTime: 10 * 60_000 });

// Contract: the server refreshes every ~60 s; poll every 30 s and on window focus
export const useMarketPrices = () =>
  useQuery({
    queryKey: queryKeys.prices,
    queryFn: api.getMarketPrices,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

// Real history per karat and range (1D also feeds the 24h sparklines).
// `karat` may be undefined while the page's listing is still loading.
export const usePriceHistory = (karat: Karat | undefined, range: ChartRange) =>
  useQuery({
    queryKey: queryKeys.history(karat ?? 24, range),
    queryFn: () => api.getPriceHistory(karat!, range),
    enabled: karat !== undefined,
    staleTime: range === '1D' ? 60_000 : 10 * 60_000,
    refetchInterval: range === '1D' ? 60_000 : false,
  });

// Active listings, a page at a time ("عرض المزيد")
export const useListings = (filters: ListingFilters = {}, pageSize = LISTINGS_PAGE) =>
  useInfiniteQuery({
    queryKey: [...queryKeys.listings(filters), pageSize],
    queryFn: ({ pageParam }) => api.getListings(filters, pageSize, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => {
      const next = last.offset + last.items.length;
      return next < last.total ? next : undefined;
    },
  });

export const useMyListings = (enabled = true) =>
  useQuery({ queryKey: queryKeys.myListings, queryFn: () => api.getMyListings(), enabled });

export const useListing = (id: string | undefined) =>
  useQuery({
    queryKey: queryKeys.listing(id ?? ''),
    queryFn: () => api.getListingById(id!),
    enabled: Boolean(id),
  });

export const useTransactions = () => useQuery({ queryKey: queryKeys.transactions, queryFn: api.getTransactions });

export const useOwnership = (role: UserRole | undefined) =>
  useQuery({ queryKey: queryKeys.ownership, queryFn: api.getOwnership, enabled: role === 'investor' });

export const useTransaction = (id: string | null) =>
  useQuery({
    queryKey: queryKeys.transaction(id ?? ''),
    queryFn: () => api.getTransaction(id!),
    enabled: Boolean(id),
  });

// 403 SUBSCRIPTION_REQUIRED is an answer, not a failure: never retried
export const useInsights = () => useQuery({ queryKey: queryKeys.insights, queryFn: api.getAiInsights, retry: false });

export const useSubscriptionStatus = (role: UserRole | undefined) =>
  useQuery({
    queryKey: queryKeys.subscription,
    queryFn: api.getSubscriptionStatus,
    enabled: role === 'investor',
  });
