// src/lib/status.ts
// Domain checks. Time-dependent ones take `now` (from useNow) so components stay pure and
// re-render as time passes.

import { AssetListing, User } from './types';

// Premium access is the server's date check (`is_premium_active`), never the tier (contract §3.6)
export const isPremiumActive = (user: Pick<User, 'is_premium_active'>): boolean => user.is_premium_active;

export const premiumExpiry = (user: Pick<User, 'subscription_expiry_date'>): number =>
  user.subscription_expiry_date ? new Date(user.subscription_expiry_date).getTime() : 0;

// `is_promoted` is expiry-aware on the server; the date check keeps it right while a page stays open
export const isPromotedAt = (listing: AssetListing, now: number): boolean =>
  listing.is_promoted &&
  Boolean(listing.promotion_expiry_date) &&
  new Date(listing.promotion_expiry_date!).getTime() > now;

const DAY_MS = 86_400_000;

export const promotionDaysLeft = (listing: AssetListing, now: number): number | null => {
  if (!isPromotedAt(listing, now)) return null;
  return Math.ceil((new Date(listing.promotion_expiry_date!).getTime() - now) / DAY_MS);
};
