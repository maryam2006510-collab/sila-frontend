// src/features/shell/NotFoundPage.tsx
// Fallback for unknown routes: the brand mark, what happened, and one way back
// (the dashboard when signed in, the home page otherwise).

import React from 'react';
import { Logo } from '@/components/ui/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { useSessionStore } from '@/lib/session';
import { useT } from '@/i18n';

export const NotFoundPage: React.FC = () => {
  const t = useT();
  const hasSession = useSessionStore((s) => s.hasSession);

  return (
    <div className="min-h-screen bg-canvas text-fg flex flex-col items-center justify-center gap-5 p-5 text-center">
      <Logo variant="icon" tone="auto" height={40} linkHome />
      <div className="flex flex-col gap-2">
        <h1 className="text-h3 font-semibold m-0">{t.shell.notFoundTitle}</h1>
        <p className="text-body text-fg-muted m-0">{t.shell.notFoundBody}</p>
      </div>
      <ButtonLink to={hasSession ? '/app' : '/'} variant="secondary" size="md">
        {hasSession ? t.common.backToDashboard : t.common.backHome}
      </ButtonLink>
    </div>
  );
};
