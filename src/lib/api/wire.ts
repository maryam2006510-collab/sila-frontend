// src/lib/api/wire.ts
// Exact request/response shapes of the backend (API_CONTRACT.md), taken from the generated
// OpenAPI types. Regenerate with `npm run api:types` whenever openapi.json changes.
// Money and weights arrive as decimal strings; adapters.ts turns them into domain values.

import type { components } from './schema';

type S = components['schemas'];

export type UserOut = S['UserOut'];
export type SignupIn = S['SignupIn'];
export type LoginIn = S['LoginIn'];
export type LoginOut = S['LoginOut'];
export type TokenOut = S['TokenOut'];
export type KycOut = S['KycOut'];

export type MarketPricesOut = S['MarketPricesOut'];
export type PriceHistoryOut = S['PriceHistoryOut'];

export type ListingOut = S['ListingOut'];
export type ListingCreateIn = S['ListingCreateIn'];
export type ListingStatusIn = S['ListingStatusIn'];
export type PromoteOut = S['PromoteOut'];
export type PageListingOut = S['Page_ListingOut_'];

export type MatchIn = S['MatchIn'];
export type MatchOut = S['MatchOut'];
export type RiskAnalysisIn = S['RiskAnalysisIn'];
export type RiskAnalysisOut = S['RiskAnalysisOut'];
export type InsightsOut = S['InsightsOut'];
export type AdvisorIn = S['AdvisorIn'];
export type AdvisorOut = S['AdvisorOut'];

export type PreviewIn = S['PreviewIn'];
export type PreviewOut = S['PreviewOut'];
export type ConfirmIn = S['ConfirmIn'];
export type ConfirmOut = S['ConfirmOut'];
export type TransactionOut = S['TransactionOut'];
export type PageTransactionOut = S['Page_TransactionOut_'];

export type SubscribeOut = S['SubscribeOut'];
export type SubscriptionStatusOut = S['SubscriptionStatusOut'];
export type OwnershipOut = S['OwnershipOut'];
export type PublicConfigOut = S['PublicConfigOut'];

export type ResaleIn = S['ResaleIn'];
export type ResaleStatusIn = S['ResaleStatusIn'];
export type NotificationsOut = S['NotificationsOut'];
export type NotificationOut = S['NotificationOut'];
export type MarkReadIn = S['MarkReadIn'];
export type AlertIn = S['AlertIn'];
export type AlertOut = S['AlertOut'];
export type AlertStatusIn = S['AlertStatusIn'];
export type InterestIn = S['InterestIn'];
export type InterestReplyOut = S['InterestReplyOut'];
export type ChangePasswordIn = S['ChangePasswordIn'];
export type ForgotPasswordIn = S['ForgotPasswordIn'];
export type MessageOut = S['MessageOut'];
export type OverviewOut = S['OverviewOut'];
export type AdminUserOut = S['AdminUserOut'];
export type AdminUserPatch = S['AdminUserPatch'];
export type PageAdminUserOut = S['Page_AdminUserOut_'];
export type TempPasswordOut = S['TempPasswordOut'];
export type AdminListingPatch = S['AdminListingPatch'];
export type ResetRequestOut = S['ResetRequestOut'];
export type ResetRequestPatch = S['ResetRequestPatch'];
export type AuditOut = S['AuditOut'];
export type PageAuditOut = S['Page_AuditOut_'];
export type InterestSignupOut = S['InterestSignupOut'];
export type ErrorResponse = S['ErrorResponse'];
export type HealthOut = S['HealthOut'];

export type ChartRangeWire = PriceHistoryOut['range'];
export type ListingSort = 'promoted_first' | 'newest' | 'price_asc' | 'price_desc';
