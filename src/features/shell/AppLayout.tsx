// src/features/shell/AppLayout.tsx
// Core App Shell Wrapper per UI Kit 04-layout §9

import React, { useEffect } from 'react';
import { prefetchAppRoutes } from '@/app/router';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import * as m from 'motion/react-m';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileTabBar } from './MobileTabBar';
import { KycModal } from '@/features/kyc/KycModal';
import { SessionExpiredDialog } from '@/features/auth/SessionExpiredDialog';
import { signOut, useLogin } from '@/features/auth/session';
import { ToastContainer } from '@/components/ui/Toast';
import { toast } from '@/components/ui/toastStore';
import { ErrorState } from '@/components/ui/ErrorState';
import { useMe, useMarketPrices } from '@/lib/queries';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, SHOW_DEMO_ACCOUNTS } from '@/lib/demoAccounts';
import { transition } from '@/motion/tokens';
import { useT } from '@/i18n';
import { AppOutletContext } from './appContext';

type Shell = ReturnType<typeof useT>['shell'];

// Topbar title per route; `short` replaces it on phones where the full one would truncate
const getPageTitle = (path: string, s: Shell): { title: string; short?: string } => {
  const { nav, pageTitles } = s;
  if (path.includes('/market/')) return { title: pageTitles.listingDetail };
  if (path.includes('/market')) return { title: nav.market };
  if (path.includes('/match')) return { title: nav.match };
  if (path.includes('/checkout')) return { title: pageTitles.checkout, short: pageTitles.checkoutShort };
  if (path.includes('/portfolio')) return { title: nav.portfolio };
  if (path.includes('/transactions')) return { title: nav.transactions };
  if (path.includes('/listings/new')) return { title: nav.addListing };
  if (path.includes('/listings')) return { title: nav.myListings };
  if (path.includes('/sales')) return { title: nav.sales };
  if (path.includes('/premium') || path.includes('/insights')) return { title: nav.premium };
  if (path.includes('/settings')) return { title: nav.settings };
  return { title: nav.dashboard };
};

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // RequireAuth guarantees `me` is loaded before this renders
  const user = useMe().data!;
  const pricesQuery = useMarketPrices();
  const login = useLogin();
  const t = useT();

  const handleLogout = () => {
    signOut();
    navigate('/login', { replace: true });
  };

  // Mock mode and dev builds: jump between the contract's demo investor and seller
  const handleSwitchRole = () => {
    const next = user.role === 'investor' ? DEMO_ACCOUNTS.seller : DEMO_ACCOUNTS.investor;
    login.mutate(
      { email: next.email, password: DEMO_PASSWORD },
      {
        onSuccess: () => {
          navigate('/app');
          toast.info(t.shell.switchedDemoAccount, next.full_name);
        },
      }
    );
  };

  const prices = pricesQuery.data;

  // The role's other pages load in the background once this one is up (D35)
  useEffect(() => prefetchAppRoutes(user.role), [user.role]);

  return (
    <div className="min-h-screen bg-canvas text-fg flex">
      {/* First Tab stop: jump past the sidebar and topbar straight to the page (WCAG 2.4.1) */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-toast focus:px-4 focus:py-3 focus:rounded-sm focus:bg-surface-1 focus:text-fg focus:border focus:border-line-focus focus:outline-none focus:ring-3 focus:ring-line-focus/35 text-body font-semibold"
      >
        {t.shell.skipToContent}
      </a>
      <Sidebar user={user} onLogout={handleLogout} onSwitchRole={SHOW_DEMO_ACCOUNTS ? handleSwitchRole : undefined} />

      {/* Bottom padding clears the 64px mobile tab bar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen pb-20 lg:pb-0">
        <Topbar {...getPageTitle(location.pathname, t.shell)} prices={prices} />

        {/* Page padding-inline: 20 (mobile) · 32 (tablet) · 52 (desktop), content capped at g7 (04-layout §6) */}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 w-full max-w-g7 mx-auto px-5 md:px-8 xl:px-13 py-8 outline-none"
        >
          {prices ? (
            // Route change (07-motion §3 #3, D31): the page fades in (opacity only, so fixed children
            // keep the viewport as their box) while its sections rise in sequence (.page-stagger)
            <m.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={transition.page}
              className="page-stagger"
            >
              <Outlet context={{ user, prices } satisfies AppOutletContext} />
            </m.div>
          ) : pricesQuery.isError ? (
            <ErrorState message={t.shell.pricesFailed} onRetry={() => pricesQuery.refetch()} />
          ) : (
            <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
          )}
        </main>
      </div>

      <MobileTabBar role={user.role} onLogout={handleLogout} />

      <KycModal />
      <SessionExpiredDialog />
      <ToastContainer />
    </div>
  );
};
