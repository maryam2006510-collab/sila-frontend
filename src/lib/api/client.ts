// src/lib/api/client.ts
// Typed endpoint map: one method per endpoint in API_CONTRACT.md §4. Each method sends the
// exact wire shape and returns domain types through the adapters.

import { request, toQuery } from './http';
import type * as W from './wire';
import {
  toAdminOverview,
  toAdminUser,
  toAlert,
  toAuditEntry,
  toInterestSignup,
  toNotifications,
  toResetRequest,
  gramsOut,
  iqdOut,
  toAdvisor,
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
  AlertDirection,
  ChartRange,
  InterestAssetClass,
  Karat,
  ListingType,
  ResetRequestStatus,
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
  // Each question is independent: no history is sent (privacy, API_CONTRACT AI Advisor)
  askAdvisor: async (question: string, budgetIqd?: number) =>
    toAdvisor(
      await request<W.AdvisorOut>('POST', '/api/ai/advisor', {
        body: {
          question,
          ...(budgetIqd !== undefined ? { budget_iqd: iqdOut(budgetIqd) } : {}),
        } satisfies W.AdvisorIn,
      })
    ),
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

  // Passwords (forgot: handled by an admin, no e-mail)
  forgotPassword: async (email: string) =>
    (
      await request<W.MessageOut>('POST', '/api/auth/forgot-password', {
        body: { email } satisfies W.ForgotPasswordIn,
        auth: false,
      })
    ).message,
  // Returns fresh tokens (every older session stops working)
  changePassword: async (currentPassword: string, newPassword: string) =>
    toLoginResult(
      await request<W.LoginOut>('POST', '/api/users/me/password', {
        body: { current_password: currentPassword, new_password: newPassword } satisfies W.ChangePasswordIn,
      })
    ),

  // Investor resale (Workflow 09)
  createResale: async (karatValue: Karat, grams: number, idempotencyKey: string) =>
    toListing(
      await request<W.ListingOut>('POST', '/api/ownership/resale', {
        body: { karat: karatValue, weight_grams: gramsOut(grams) } satisfies W.ResaleIn,
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    ),
  getMyResales: async () => (await request<W.ListingOut[]>('GET', '/api/ownership/resale')).map(toListing),
  setResaleStatus: async (id: string, status: 'active' | 'suspended' | 'withdrawn') =>
    toListing(
      await request<W.ListingOut>('PATCH', `/api/ownership/resale/${encodeURIComponent(id)}`, {
        body: { status } satisfies W.ResaleStatusIn,
      })
    ),

  // Notifications (any signed-in user)
  getNotifications: async () => toNotifications(await request<W.NotificationsOut>('GET', '/api/notifications')),
  markNotificationsRead: async (ids?: string[]) =>
    toNotifications(
      await request<W.NotificationsOut>('POST', '/api/notifications/read', {
        body: (ids?.length ? { ids } : {}) satisfies W.MarkReadIn,
      })
    ),

  // Premium price alerts
  getAlerts: async () => (await request<W.AlertOut[]>('GET', '/api/alerts')).map(toAlert),
  createAlert: async (karatValue: Karat, direction: AlertDirection, target: number) =>
    toAlert(
      await request<W.AlertOut>('POST', '/api/alerts', {
        body: { karat: karatValue, direction, target_price_per_gram: iqdOut(target) } satisfies W.AlertIn,
      })
    ),
  cancelAlert: async (id: string) =>
    toAlert(
      await request<W.AlertOut>('PATCH', `/api/alerts/${encodeURIComponent(id)}`, {
        body: { status: 'cancelled' } satisfies W.AlertStatusIn,
      })
    ),

  // Coming soon (public)
  registerInterest: async (email: string, assetClass: InterestAssetClass) =>
    (
      await request<W.InterestReplyOut>('POST', '/api/interest', {
        body: { email, asset_class: assetClass } satisfies W.InterestIn,
        auth: false,
      })
    ).message,

  // Administration (admin only)
  admin: {
    overview: async () => toAdminOverview(await request<W.OverviewOut>('GET', '/api/admin/overview')),
    users: async (q: string, role: UserRole | undefined, offset = 0) =>
      toPage(
        await request<W.PageAdminUserOut>(
          'GET',
          `/api/admin/users${toQuery({ q: q || undefined, role, limit: 20, offset })}`
        ),
        toAdminUser
      ),
    updateUser: async (id: string, patch: { is_active?: boolean; kyc_verified?: boolean }) =>
      toAdminUser(
        await request<W.AdminUserOut>('PATCH', `/api/admin/users/${encodeURIComponent(id)}`, {
          body: patch satisfies W.AdminUserPatch,
        })
      ),
    resetPassword: async (id: string) => {
      const out = await request<W.TempPasswordOut>('POST', `/api/admin/users/${encodeURIComponent(id)}/reset-password`);
      return { user: toAdminUser(out.user), temporary_password: out.temporary_password };
    },
    listings: async (status: ListingStatus | undefined, listingType: ListingType | undefined, offset = 0) =>
      toPage(
        await request<W.PageListingOut>(
          'GET',
          `/api/admin/listings${toQuery({ status, listing_type: listingType, limit: 20, offset })}`
        ),
        toListing
      ),
    moderateListing: async (id: string, status: 'active' | 'suspended') =>
      toListing(
        await request<W.ListingOut>('PATCH', `/api/admin/listings/${encodeURIComponent(id)}`, {
          body: { status } satisfies W.AdminListingPatch,
        })
      ),
    passwordRequests: async (status: ResetRequestStatus) =>
      (await request<W.ResetRequestOut[]>('GET', `/api/admin/password-requests${toQuery({ status })}`)).map(
        toResetRequest
      ),
    dismissPasswordRequest: async (id: string) =>
      toResetRequest(
        await request<W.ResetRequestOut>('PATCH', `/api/admin/password-requests/${encodeURIComponent(id)}`, {
          body: { status: 'dismissed' } satisfies W.ResetRequestPatch,
        })
      ),
    audit: async (eventType: string | undefined, offset = 0) =>
      toPage(
        await request<W.PageAuditOut>(
          'GET',
          `/api/admin/audit${toQuery({ event_type: eventType || undefined, limit: 50, offset })}`
        ),
        toAuditEntry
      ),
    interest: async () => (await request<W.InterestSignupOut[]>('GET', '/api/admin/interest')).map(toInterestSignup),
  },
};
