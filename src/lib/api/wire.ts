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
export type ErrorResponse = S['ErrorResponse'];
export type HealthOut = S['HealthOut'];

export type ChartRangeWire = PriceHistoryOut['range'];
export type ListingSort = 'promoted_first' | 'newest' | 'price_asc' | 'price_desc';
