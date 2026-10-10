// src/features/shell/navItems.ts
// Navigation per role (UI Kit 08-ux §2.2), shared by the sidebar and the mobile tab bar.

import {
  BuildingsIcon,
  ChatCircleTextIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersIcon,
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
import type { Messages } from '@/i18n';

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

type Nav = Messages['shell']['nav'];

const investorPrimary = (nav: Nav): NavItem[] => [
  { to: '/app', label: nav.dashboard, shortLabel: nav.home, icon: SquaresFourIcon, end: true },
  { to: '/app/market', label: nav.market, icon: StorefrontIcon },
  { to: '/app/match', label: nav.match, shortLabel: nav.matchShort, icon: TargetIcon },
  { to: '/app/portfolio', label: nav.portfolio, shortLabel: nav.portfolioShort, icon: WalletIcon },
];

const investorSecondary = (nav: Nav): NavItem[] => [
  { to: '/app/advisor', label: nav.advisor, icon: ChatCircleTextIcon },
  { to: '/app/transactions', label: nav.transactions, icon: ClockCounterClockwiseIcon, mirror: true },
  { to: '/app/insights', label: nav.premium, icon: CrownIcon, premium: true },
];

const sellerPrimary = (nav: Nav): NavItem[] => [
  { to: '/app', label: nav.dashboard, shortLabel: nav.home, icon: SquaresFourIcon, end: true },
  { to: '/app/listings', label: nav.myListings, icon: TagIcon, end: true },
  { to: '/app/listings/new', label: nav.addListing, shortLabel: nav.addShort, icon: PlusIcon },
  { to: '/app/sales', label: nav.sales, shortLabel: nav.salesShort, icon: ReceiptIcon },
];

const sellerSecondary = (nav: Nav): NavItem[] => [{ to: '/app/market', label: nav.market, icon: StorefrontIcon }];

const settings = (nav: Nav): NavItem => ({ to: '/app/settings', label: nav.settings, icon: GearSixIcon });

const adminPrimary = (nav: Nav): NavItem[] => [
  { to: '/app', label: nav.dashboard, shortLabel: nav.home, icon: SquaresFourIcon, end: true },
  { to: '/app/admin/users', label: nav.adminUsers, icon: UsersIcon },
  { to: '/app/admin/listings', label: nav.adminListings, icon: StorefrontIcon },
  { to: '/app/admin/password-requests', label: nav.adminRequests, shortLabel: nav.adminRequestsShort, icon: KeyIcon },
];

const adminSecondary = (nav: Nav): NavItem[] => [
  { to: '/app/admin/audit', label: nav.adminAudit, icon: ShieldCheckIcon },
  { to: '/app/admin/interest', label: nav.adminInterest, icon: BuildingsIcon },
];

const primaryBy: Record<UserRole, (nav: Nav) => NavItem[]> = {
  investor: investorPrimary,
  seller: sellerPrimary,
  admin: adminPrimary,
};
const secondaryBy: Record<UserRole, (nav: Nav) => NavItem[]> = {
  investor: investorSecondary,
  seller: sellerSecondary,
  admin: adminSecondary,
};

// Desktop sidebar: everything, settings last
export const sidebarItems = (role: UserRole, nav: Nav): NavItem[] => [
  ...primaryBy[role](nav),
  ...secondaryBy[role](nav),
  settings(nav),
];

// Mobile tab bar: max 4 + "المزيد" (04-layout §9)
export const tabBarItems = (role: UserRole, nav: Nav): NavItem[] => primaryBy[role](nav);

export const moreItems = (role: UserRole, nav: Nav): NavItem[] => [...secondaryBy[role](nav), settings(nav)];
