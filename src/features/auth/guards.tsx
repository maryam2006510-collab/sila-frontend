// src/features/auth/guards.tsx
// Route guards: signed-in session, then role (RBAC mirror of the backend)

import React from 'react';
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { useSessionStore } from '@/lib/session';
import { useMe } from '@/lib/queries';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/PageLoader';
import { useT } from '@/i18n';

const FullScreenState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center gap-4 p-5 text-center">
    {children}
  </div>
);

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useT();
  const { hasSession, expired } = useSessionStore();
  const location = useLocation();
  const me = useMe();

  // An expired session keeps the current page mounted (behind the login sheet)
  // only if we already know who the user is; otherwise go to the login page.
  if (!hasSession && (!expired || !me.data)) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }

  if (me.data) return <>{children}</>;

  if (me.isError) {
    return (
      <FullScreenState>
        <WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
        <p className="text-body m-0">{t.session.accountLoadFailed}</p>
        <Button variant="secondary" size="md" onClick={() => me.refetch()}>
          {t.common.retry}
        </Button>
      </FullScreenState>
    );
  }

  return <PageLoader />;
};

// Nested under RequireAuth, so `me` is loaded here
export const RoleRoute: React.FC<{ role: UserRole }> = ({ role }) => {
  const { data: user } = useMe();
  // Outlet context reaches direct children only, so forward the layout's context
  const context = useOutletContext();
  if (user?.role !== role) return <Navigate to="/app" replace />;
  return <Outlet context={context} />;
};
