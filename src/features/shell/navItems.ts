// src/features/shell/navItems.ts
// Navigation per role (UI Kit 08-ux §2.2), shared by the sidebar and the mobile tab bar.

import {
  Icon,
  SquaresFourIcon,
  StorefrontIcon,
  TargetIcon,
  WalletIcon,
  ClockCounterClockwiseIcon,
  CrownIcon,
  TagIcon,
  PlusIcon,
  ReceiptIcon,
  GearSixIcon,
} from '@phosphor-icons/react';
import { UserRole } from '@/lib/types';
import { t } from '@/i18n';

export interface NavItem {
  to: string;
  label: string;
  // One-word label for the 64px mobile tab bar
  shortLabel?: string;
  icon: Icon;
  end?: boolean;
  // Premium mark is the only gold icon allowed in navigation (03-icon §4)
  premium?: boolean;
  // Direction-bearing icon, mirrored in RTL (03-icon §6)
  mirror?: boolean;
}

const nav = t.shell.nav;

const investorPrimary: NavItem[] = [
  { to: '/app', label: nav.dashboard, shortLabel: nav.home, icon: SquaresFourIcon, end: true },
  { to: '/app/market', label: nav.market, icon: StorefrontIcon },
  { to: '/app/match', label: nav.match, shortLabel: nav.matchShort, icon: TargetIcon },
  { to: '/app/portfolio', label: nav.portfolio, icon: WalletIcon },
];

const investorSecondary: NavItem[] = [
  { to: '/app/transactions', label: nav.transactions, icon: ClockCounterClockwiseIcon, mirror: true },
  { to: '/app/insights', label: nav.premium, icon: CrownIcon, premium: true },
];

const sellerPrimary: NavItem[] = [
  { to: '/app', label: nav.dashboard, shortLabel: nav.home, icon: SquaresFourIcon, end: true },
  { to: '/app/listings', label: nav.myListings, icon: TagIcon, end: true },
  { to: '/app/listings/new', label: nav.addListing, shortLabel: nav.addShort, icon: PlusIcon },
  { to: '/app/sales', label: nav.sales, shortLabel: nav.salesShort, icon: ReceiptIcon },
];

const sellerSecondary: NavItem[] = [{ to: '/app/market', label: nav.market, icon: StorefrontIcon }];

const settings: NavItem = { to: '/app/settings', label: nav.settings, icon: GearSixIcon };

// Desktop sidebar: everything, settings last
export const sidebarItems = (role: UserRole): NavItem[] =>
  role === 'investor'
    ? [...investorPrimary, ...investorSecondary, settings]
    : [...sellerPrimary, ...sellerSecondary, settings];

// Mobile tab bar: max 4 + "المزيد" (04-layout §9)
export const tabBarItems = (role: UserRole): NavItem[] => (role === 'investor' ? investorPrimary : sellerPrimary);

export const moreItems = (role: UserRole): NavItem[] =>
  role === 'investor' ? [...investorSecondary, settings] : [...sellerSecondary, settings];
