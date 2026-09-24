// src/lib/demoAccounts.ts
// Demo accounts of API_CONTRACT.md §7 (created by the backend's `python -m app.scripts.seed`).
// The mock server seeds the same people, so the one-click logins work in both modes.
// Shown only in mock mode or dev builds, never in production.

import { USE_MOCK } from './api';

export const DEMO_PASSWORD = 'Sila@2026';

export const DEMO_ACCOUNTS = {
  // KYC verified, medium risk, Premium active, has holdings
  investor: { email: 'zainab@sila.iq', full_name: 'زينب الموسوي' },
  // Not KYC-verified: demonstrates the KYC interrupt
  newInvestor: { email: 'ali@sila.iq', full_name: 'علي الجبوري' },
  // KYC verified, promoted listing
  seller: { email: 'karrada@sila.iq', full_name: 'مجوهرات الكرّادة' },
} as const;

export const SHOW_DEMO_ACCOUNTS = USE_MOCK || import.meta.env.DEV;
