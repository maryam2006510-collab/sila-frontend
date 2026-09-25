// src/app/router.tsx
// Route map per UI Kit 08-ux-user-flows.md §2.1
// Pages are lazy route chunks, so heavy dependencies (charts) load only where used. The app shell
// is a chunk too: a landing visitor never downloads the dashboard (D35).

import { createBrowserRouter, Outlet } from 'react-router-dom';
import { RequireAuth, RoleRoute } from '@/features/auth/guards';
import { NotFoundPage } from '@/features/shell/NotFoundPage';
import { RouteFallback } from '@/features/shell/RouteFallback';
import { UserRole } from '@/lib/types';

// One loader per chunk, shared by the routes and by prefetching (same module, fetched once)
const load = {
  shell: () => import('@/features/shell/AppLayout'),
  dashboard: () => import('@/features/auth/DashboardHome'),
  market: () => import('@/features/market/MarketPage'),
  listing: () => import('@/features/market/ListingDetailPage'),
  transactions: () => import('@/features/transactions/TransactionsPage'),
  settings: () => import('@/features/settings/SettingsPage'),
  match: () => import('@/features/match/SmartMatchPage'),
  checkout: () => import('@/features/checkout/CheckoutPage'),
  portfolio: () => import('@/features/portfolio/PortfolioPage'),
  premium: () => import('@/features/premium/PremiumPage'),
  insights: () => import('@/features/premium/InsightsPage'),
  sellerListings: () => import('@/features/seller/SellerListingsPage'),
  newListing: () => import('@/features/seller/NewListingPage'),
  sellerListing: () => import('@/features/seller/SellerListingDetailPage'),
  sales: () => import('@/features/seller/SalesPage'),
};

const SHARED = [
  load.dashboard,
  load.market,
  load.listing,
  load.transactions,
  load.settings,
  // Charts sit on most pages but load late by design (LazyPriceChart): warm them too
  () => import('@/components/fin/PriceChart'),
];
const BY_ROLE: Record<UserRole, (() => Promise<unknown>)[]> = {
  investor: [load.match, load.checkout, load.portfolio, load.premium, load.insights],
  seller: [load.sellerListings, load.newListing, load.sellerListing, load.sales],
};

// After the first screen settles, fetch the role's other pages while the browser is idle, so
// navigating is instant instead of waiting on a chunk (D35). Skipped on data-saver connections.
export const prefetchAppRoutes = (role: UserRole) => {
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  if (saveData) return;
  const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1200));
  idle(() => [...SHARED, ...BY_ROLE[role]].forEach((l) => l().catch(() => {})));
};

// The app shell alone, e.g. while the sign-in form is open
export const prefetchAppShell = () => {
  load.shell().catch(() => {});
};

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    hydrateFallbackElement: <RouteFallback />,
    children: [
      // Landing: its own chunk (GSAP never enters the app bundle)
      { path: '/', lazy: () => import('@/features/landing/LandingPage').then((m) => ({ Component: m.LandingPage })) },
      { path: '/login', lazy: () => import('@/features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
      {
        path: '/signup',
        lazy: () => import('@/features/auth/RoleSelectPage').then((m) => ({ Component: m.RoleSelectPage })),
      },
      {
        path: '/signup/:role',
        lazy: () => import('@/features/auth/SignupPage').then((m) => ({ Component: m.SignupPage })),
      },
      {
        path: '/app',
        lazy: () =>
          load.shell().then(({ AppLayout }) => ({
            element: (
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            ),
          })),
        children: [
          // Both roles
          { index: true, lazy: () => load.dashboard().then((m) => ({ Component: m.DashboardHome })) },
          { path: 'market', lazy: () => load.market().then((m) => ({ Component: m.MarketPage })) },
          { path: 'market/:id', lazy: () => load.listing().then((m) => ({ Component: m.ListingDetailPage })) },
          { path: 'transactions', lazy: () => load.transactions().then((m) => ({ Component: m.TransactionsPage })) },
          { path: 'settings', lazy: () => load.settings().then((m) => ({ Component: m.SettingsPage })) },
          {
            element: <RoleRoute role="investor" />,
            children: [
              { path: 'match', lazy: () => load.match().then((m) => ({ Component: m.SmartMatchPage })) },
              {
                path: 'checkout/:listingId',
                lazy: () => load.checkout().then((m) => ({ Component: m.CheckoutPage })),
              },
              { path: 'portfolio', lazy: () => load.portfolio().then((m) => ({ Component: m.PortfolioPage })) },
              { path: 'premium', lazy: () => load.premium().then((m) => ({ Component: m.PremiumPage })) },
              { path: 'insights', lazy: () => load.insights().then((m) => ({ Component: m.InsightsPage })) },
            ],
          },
          {
            element: <RoleRoute role="seller" />,
            children: [
              {
                path: 'listings',
                lazy: () => load.sellerListings().then((m) => ({ Component: m.SellerListingsPage })),
              },
              { path: 'listings/new', lazy: () => load.newListing().then((m) => ({ Component: m.NewListingPage })) },
              {
                path: 'listings/:id',
                lazy: () => load.sellerListing().then((m) => ({ Component: m.SellerListingDetailPage })),
              },
              { path: 'sales', lazy: () => load.sales().then((m) => ({ Component: m.SalesPage })) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
