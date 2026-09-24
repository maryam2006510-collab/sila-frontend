// src/lib/mock/data.ts
// Seed of the in-memory mock, mirroring the backend's `python -m app.scripts.seed`
// (API_CONTRACT.md §7): the same people, the same listings, the same purchases, so the
// demo accounts behave identically in mock mode and against the real API.
// Values are kept as plain numbers here; server.ts serializes them to the wire format.

import type { Karat, ListingStatus, RiskProfile, SubscriptionTier, UserRole } from '../types';
import type { PublicConfigOut } from '../api/wire';

export const DEMO_PASSWORD = 'Sila@2026';

const DAY_MS = 86_400_000;

// Readable, stable UUIDs so tests and bookmarks survive a reload (the mock resets on reload)
const uuid = (group: number, n: number) => `00000000-0000-4000-8${group}00-${String(n).padStart(12, '0')}`;

export interface SeedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  kyc_verified: boolean;
  risk_profile: RiskProfile | null;
  subscription_tier: SubscriptionTier;
  // Offset from "now" in days (negative = in the past); null = never subscribed
  subscription_days: number | null;
}

export const SEED_USERS: SeedUser[] = [
  {
    id: uuid(1, 1),
    email: 'karrada@sila.iq',
    full_name: 'مجوهرات الكرّادة',
    role: 'seller',
    kyc_verified: true,
    risk_profile: null,
    subscription_tier: 'free',
    subscription_days: null,
  },
  {
    id: uuid(1, 2),
    email: 'nahr@sila.iq',
    full_name: 'صاغة شارع النهر',
    role: 'seller',
    kyc_verified: true,
    risk_profile: null,
    subscription_tier: 'free',
    subscription_days: null,
  },
  {
    id: uuid(1, 3),
    email: 'mansour@sila.iq',
    full_name: 'ذهب المنصور',
    role: 'seller',
    kyc_verified: false,
    risk_profile: null,
    subscription_tier: 'free',
    subscription_days: null,
  },
  {
    id: uuid(1, 4),
    email: 'zainab@sila.iq',
    full_name: 'زينب الموسوي',
    role: 'investor',
    kyc_verified: true,
    risk_profile: 'medium',
    subscription_tier: 'premium',
    subscription_days: 21,
  },
  {
    id: uuid(1, 5),
    email: 'haider@sila.iq',
    full_name: 'حيدر العبيدي',
    role: 'investor',
    kyc_verified: true,
    risk_profile: 'high',
    subscription_tier: 'free',
    subscription_days: null,
  },
  {
    id: uuid(1, 6),
    email: 'ali@sila.iq',
    full_name: 'علي الجبوري',
    role: 'investor',
    kyc_verified: false,
    risk_profile: 'low',
    subscription_tier: 'free',
    subscription_days: null,
  },
  // Stale 'premium' tier with an expired date (demonstrates the upgrade flow)
  {
    id: uuid(1, 7),
    email: 'sara@sila.iq',
    full_name: 'سارة الدليمي',
    role: 'investor',
    kyc_verified: true,
    risk_profile: 'low',
    subscription_tier: 'premium',
    subscription_days: -2,
  },
];

export interface SeedListing {
  id: string;
  seller_email: string;
  grams: number;
  karat: Karat;
  days_ago: number;
  status: ListingStatus;
  // Promotion days left from now (negative = expired); null = never promoted
  promoted_days: number | null;
}

export const SEED_LISTINGS: SeedListing[] = [
  {
    id: uuid(2, 1),
    seller_email: 'karrada@sila.iq',
    grams: 84.25,
    karat: 21,
    days_ago: 12,
    status: 'active',
    promoted_days: 5,
  },
  {
    id: uuid(2, 2),
    seller_email: 'karrada@sila.iq',
    grams: 250,
    karat: 24,
    days_ago: 9,
    status: 'active',
    promoted_days: null,
  },
  {
    id: uuid(2, 3),
    seller_email: 'karrada@sila.iq',
    grams: 37.5,
    karat: 18,
    days_ago: 7,
    status: 'active',
    promoted_days: -1,
  },
  {
    id: uuid(2, 4),
    seller_email: 'nahr@sila.iq',
    grams: 120.75,
    karat: 22,
    days_ago: 6,
    status: 'active',
    promoted_days: null,
  },
  {
    id: uuid(2, 5),
    seller_email: 'nahr@sila.iq',
    grams: 512.3,
    karat: 24,
    days_ago: 4,
    status: 'active',
    promoted_days: null,
  },
  {
    id: uuid(2, 6),
    seller_email: 'nahr@sila.iq',
    grams: 15.125,
    karat: 21,
    days_ago: 3,
    status: 'active',
    promoted_days: null,
  },
  {
    id: uuid(2, 7),
    seller_email: 'nahr@sila.iq',
    grams: 64.8,
    karat: 18,
    days_ago: 2,
    status: 'suspended',
    promoted_days: null,
  },
  {
    id: uuid(2, 8),
    seller_email: 'karrada@sila.iq',
    grams: 199.99,
    karat: 22,
    days_ago: 1,
    status: 'active',
    promoted_days: null,
  },
];

// Purchases go through the same purchase logic as live ones (server.ts), so every balance
// and signature is consistent
export const SEED_PURCHASES: { investor_email: string; listing_id: string; grams: number; days_ago: number }[] = [
  { investor_email: 'zainab@sila.iq', listing_id: uuid(2, 1), grams: 10, days_ago: 10 },
  { investor_email: 'zainab@sila.iq', listing_id: uuid(2, 4), grams: 55.5, days_ago: 5 },
  { investor_email: 'haider@sila.iq', listing_id: uuid(2, 2), grams: 205, days_ago: 8 },
  // Buys it all → sold_out
  { investor_email: 'haider@sila.iq', listing_id: uuid(2, 6), grams: 15.125, days_ago: 2 },
  { investor_email: 'sara@sila.iq', listing_id: uuid(2, 5), grams: 3.75, days_ago: 1 },
];

// Market anchor: gold at ~4,270 USD/oz and 1,308.45 IQD per USD (the backend's live figures)
export const XAU_USD_PER_OUNCE = 4270.5;
export const USD_IQD = 1308.4454;
export const GRAMS_PER_OUNCE = 31.1034768;

// GET /api/config
export const MOCK_CONFIG: PublicConfigOut = {
  currency: 'IQD',
  supported_karats: [24, 22, 21, 18],
  commission_tiers: [
    { label: '< 50 g', min_grams: null, max_grams: '49.999', rate: '0.0150' },
    // The server's own label (an en dash, escaped here: no literal dashes in source copy)
    { label: '50 \u2013 200 g', min_grams: '50.000', max_grams: '200.000', rate: '0.0100' },
    { label: '> 200 g', min_grams: '200.001', max_grams: null, rate: '0.0050' },
  ],
  promotion_fee_iqd: '25000',
  promotion_duration_days: 7,
  subscription_price_iqd: '15000',
  subscription_duration_days: 30,
  quote_ttl_seconds: 60,
};

export const OWNERSHIP_DISCLAIMER =
  'التوقيع الرقمي إثبات تقني داخلي لسلامة رصيدك داخل منصة صِلة، وليس سند ملكية قانونياً معترفاً به رسمياً.';

export const MOCK_DAY_MS = DAY_MS;
