// src/app/router.tsx
// Route map per UI Kit 08-ux-user-flows.md §2.1
// Pages are lazy route chunks, so heavy dependencies (charts) load only where used.

import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AppLayout } from '@/features/shell/AppLayout';
import { RequireAuth, RoleRoute } from '@/features/auth/guards';
import { NotFoundPage } from '@/features/shell/NotFoundPage';
import { RouteFallback } from '@/features/shell/RouteFallback';

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
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          // Both roles
          {
            index: true,
            lazy: () => import('@/features/auth/DashboardHome').then((m) => ({ Component: m.DashboardHome })),
          },
          {
            path: 'market',
            lazy: () => import('@/features/market/MarketPage').then((m) => ({ Component: m.MarketPage })),
          },
          {
            path: 'market/:id',
            lazy: () => import('@/features/market/ListingDetailPage').then((m) => ({ Component: m.ListingDetailPage })),
          },
          {
            path: 'transactions',
            lazy: () =>
              import('@/features/transactions/TransactionsPage').then((m) => ({ Component: m.TransactionsPage })),
          },
          {
            path: 'settings',
            lazy: () => import('@/features/settings/SettingsPage').then((m) => ({ Component: m.SettingsPage })),
          },
          {
            element: <RoleRoute role="investor" />,
            children: [
              {
                path: 'match',
                lazy: () => import('@/features/match/SmartMatchPage').then((m) => ({ Component: m.SmartMatchPage })),
              },
              {
                path: 'checkout/:listingId',
                lazy: () => import('@/features/checkout/CheckoutPage').then((m) => ({ Component: m.CheckoutPage })),
              },
              {
                path: 'portfolio',
                lazy: () => import('@/features/portfolio/PortfolioPage').then((m) => ({ Component: m.PortfolioPage })),
              },
              {
                path: 'premium',
                lazy: () => import('@/features/premium/PremiumPage').then((m) => ({ Component: m.PremiumPage })),
              },
              {
                path: 'insights',
                lazy: () => import('@/features/premium/InsightsPage').then((m) => ({ Component: m.InsightsPage })),
              },
            ],
          },
          {
            element: <RoleRoute role="seller" />,
            children: [
              {
                path: 'listings',
                lazy: () =>
                  import('@/features/seller/SellerListingsPage').then((m) => ({ Component: m.SellerListingsPage })),
              },
              {
                path: 'listings/new',
                lazy: () => import('@/features/seller/NewListingPage').then((m) => ({ Component: m.NewListingPage })),
              },
              {
                path: 'listings/:id',
                lazy: () =>
                  import('@/features/seller/SellerListingDetailPage').then((m) => ({
                    Component: m.SellerListingDetailPage,
                  })),
              },
              {
                path: 'sales',
                lazy: () => import('@/features/seller/SalesPage').then((m) => ({ Component: m.SalesPage })),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
