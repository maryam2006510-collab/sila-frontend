// src/lib/api/client.ts
// Typed endpoint map: one method per endpoint in API_CONTRACT.md §4. Each method sends the
// exact wire shape and returns domain types through the adapters.

import { request, toQuery } from './http';
import type * as W from './wire';
import {
  gramsOut,
  iqdOut,
  toConfirmResult,
  toInsights,
  toListing,
  toLoginResult,
  toMarketPrices,
  toMatch,
  toOwnership,
  toPage,
  toPreview,
  toPriceHistory,
  toPromoteResult,
  toRiskAnalysis,
  toServerConfig,
  toSubscription,
  toTransaction,
  toUser,
} from './adapters';
import type {
  AssetListing,
  ChartRange,
  Karat,
  ListingFilters,
  ListingStatus,
  LoginRequest,
  Page,
  SignupRequest,
  Transaction,
  TransactionPreviewRequest,
  UserRole,
} from '../types';

// Contract §1: pages are capped at 100
const MAX_PAGE = 100;

// Walks every page. Used where the UI needs the whole set (history, a seller's own listings)
// because its totals (grams sold, amount received) are computed from it.
const fetchAll = async <In, Out>(
  path: string,
  params: Record<string, string | number | undefined>,
  map: (x: In) => Out,
  auth = true
): Promise<Out[]> => {
  const all: Out[] = [];
  for (let offset = 0; ; offset += MAX_PAGE) {
    const page = await request<{ items: In[]; total: number }>(
      'GET',
      `${path}${toQuery({ ...params, limit: MAX_PAGE, offset })}`,
      { auth }
    );
    all.push(...page.items.map(map));
    if (all.length >= page.total || page.items.length === 0) return all;
  }
};

export const api = {
  // Identity & Security
  // 201 returns the profile only (no tokens): sign in afterwards
  signup: async (data: SignupRequest) =>
    toUser(
      await request<W.UserOut>('POST', '/api/auth/signup', {
        body: { ...data, risk_profile: data.role === 'investor' ? data.risk_profile : undefined } satisfies W.SignupIn,
        auth: false,
      })
    ),
  login: async (data: LoginRequest) =>
    toLoginResult(
      await request<W.LoginOut>('POST', '/api/auth/login', { body: data satisfies W.LoginIn, auth: false })
    ),
  getCurrentUser: async () => toUser(await request<W.UserOut>('GET', '/api/users/me')),
  verifyKyc: async (role: UserRole) =>
    toUser((await request<W.KycOut>('POST', role === 'seller' ? '/api/kyc/seller' : '/api/kyc/verify')).user),

  // Market Data (public)
  getMarketPrices: async () =>
    toMarketPrices(await request<W.MarketPricesOut>('GET', '/api/market/prices', { auth: false })),
  getPriceHistory: async (karat: Karat, range: ChartRange) =>
    toPriceHistory(
      await request<W.PriceHistoryOut>('GET', `/api/market/prices/history${toQuery({ karat, range })}`, { auth: false })
    ),

  // Listing & Asset
  getListings: async (filters: ListingFilters = {}, limit = 20, offset = 0): Promise<Page<AssetListing>> =>
    toPage(
      await request<W.PageListingOut>(
        'GET',
        `/api/listings${toQuery({
          karat: filters.karat,
          min_price: filters.min_price !== undefined ? iqdOut(filters.min_price) : undefined,
          max_price: filters.max_price !== undefined ? iqdOut(filters.max_price) : undefined,
          sort: filters.sort ?? 'promoted_first',
          limit,
          offset,
        })}`,
        { auth: false }
      ),
      toListing
    ),
  // The seller's own listings, every status
  getMyListings: (status?: ListingStatus) =>
    fetchAll<W.ListingOut, AssetListing>('/api/listings', { seller_id: 'me', status }, toListing),
  getListingById: async (id: string) =>
    toListing(await request<W.ListingOut>('GET', `/api/listings/${encodeURIComponent(id)}`, { auth: false })),
  // Price is computed by the server. The key makes a KYC resend return the same listing.
  createListing: async (data: { total_weight_grams: number; karat: Karat }, idempotencyKey: string) =>
    toListing(
      await request<W.ListingOut>('POST', '/api/listings', {
        body: { total_weight_grams: gramsOut(data.total_weight_grams), karat: data.karat } satisfies W.ListingCreateIn,
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    ),
  updateListingStatus: async (id: string, status: 'active' | 'suspended') =>
    toListing(
      await request<W.ListingOut>('PATCH', `/api/listings/${encodeURIComponent(id)}`, {
        body: { status } satisfies W.ListingStatusIn,
      })
    ),
  promoteListing: async (id: string) =>
    toPromoteResult(await request<W.PromoteOut>('POST', `/api/listings/${encodeURIComponent(id)}/promote`)),

  // AI Engine (investor)
  matchBudget: async (budgetIqd: number) =>
    toMatch(
      await request<W.MatchOut>('POST', '/api/ai/match', {
        body: { budget_iqd: iqdOut(budgetIqd) } satisfies W.MatchIn,
      })
    ),
  getAiInsights: async () => toInsights(await request<W.InsightsOut>('GET', '/api/ai/insights')),
  riskAnalysis: async (assetId: string, grams: number) =>
    toRiskAnalysis(
      await request<W.RiskAnalysisOut>('POST', '/api/ai/risk-analysis', {
        body: { asset_id: assetId, weight_grams: gramsOut(grams) } satisfies W.RiskAnalysisIn,
      })
    ),

  // Order & Transaction
  previewTransaction: async (data: TransactionPreviewRequest) =>
    toPreview(
      await request<W.PreviewOut>('POST', '/api/transactions/preview', {
        body: {
          asset_id: data.asset_id,
          purchased_weight_grams: gramsOut(data.purchased_weight_grams),
        } satisfies W.PreviewIn,
      })
    ),
  // One key per confirmation screen, reused on every retry (contract §5)
  confirmTransaction: async (data: TransactionPreviewRequest, quoteToken: string, idempotencyKey: string) =>
    toConfirmResult(
      await request<W.ConfirmOut>('POST', '/api/transactions/confirm', {
        body: {
          asset_id: data.asset_id,
          purchased_weight_grams: gramsOut(data.purchased_weight_grams),
          quote_token: quoteToken,
        } satisfies W.ConfirmIn,
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    ),
  // Investor: my purchases. Seller: sales on my listings.
  getTransactions: () => fetchAll<W.TransactionOut, Transaction>('/api/transactions', {}, toTransaction),
  getTransaction: async (id: string) =>
    toTransaction(await request<W.TransactionOut>('GET', `/api/transactions/${encodeURIComponent(id)}`)),

  // Subscription (investor)
  subscribePremium: async () => toSubscription(await request<W.SubscribeOut>('POST', '/api/subscription/subscribe')),
  getSubscriptionStatus: async () =>
    toSubscription(await request<W.SubscriptionStatusOut>('GET', '/api/subscription/status')),

  // Ownership (investor)
  getOwnership: async () => toOwnership(await request<W.OwnershipOut>('GET', '/api/ownership/me')),

  // System (public)
  getConfig: async () => toServerConfig(await request<W.PublicConfigOut>('GET', '/api/config', { auth: false })),
};
