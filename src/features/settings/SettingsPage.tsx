// src/features/settings/SettingsPage.tsx
// Account, appearance, subscription and session (UI Kit 08-ux §2.1 /app/settings).
// Language switching stays hidden until English ships (PLAN.md §0).

import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SealCheckIcon, IdentificationCardIcon, ArrowUpRightIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { useAppContext } from '@/features/shell/appContext';
import { openKyc } from '@/features/kyc/kycStore';
import { signOut } from '@/features/auth/session';
import { useThemeStore, Theme } from '@/app/theme';
import { useMirrored } from '@/lib/direction';
import { fmtDate } from '@/lib/formatters';
import { isPremiumActive, premiumExpiry } from '@/lib/status';
import { useT } from '@/i18n';

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 min-h-11 py-2 border-b border-line-subtle last:border-b-0">
    <dt className="text-body text-fg-muted">{label}</dt>
    <dd className="m-0 text-body font-medium text-fg">{children}</dd>
  </div>
);

export const SettingsPage: React.FC = () => {
  const t = useT();
  const s = t.settings;
  const navigate = useNavigate();
  const mirrored = useMirrored();
  const { user } = useAppContext();
  const { theme, setTheme } = useThemeStore();
  const isInvestor = user.role === 'investor';

  const expiry = premiumExpiry(user);
  const premiumActive = isPremiumActive(user);

  return (
    <div className="mx-auto w-full max-w-g6 flex flex-col gap-5">
      <Card padding="normal" className="gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{s.account}</h2>
        <dl className="m-0">
          <Row label={t.auth.fullName}>{user.full_name}</Row>
          <Row label={t.auth.email}>
            <bdi dir="ltr">{user.email}</bdi>
          </Row>
          <Row label={s.role}>{isInvestor ? t.shell.roleInvestor : t.shell.roleSeller}</Row>
          {isInvestor && <Row label={t.auth.riskProfile}>{t.auth.riskName[user.risk_profile ?? 'medium']}</Row>}
          <Row label={s.verification}>
            {user.kyc_verified ? (
              <span className="inline-flex items-center gap-1 text-success-fg">
                <SealCheckIcon size={16} weight="fill" aria-hidden="true" />
                {t.shell.verified}
              </span>
            ) : (
              <span className="inline-flex flex-wrap items-center gap-3">
                <span className="text-fg-muted">
                  {isInvestor ? t.shell.kycPendingInvestor : t.shell.kycPendingSeller}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<IdentificationCardIcon size={16} />}
                  onClick={() => openKyc({ role: user.role })}
                >
                  {t.checkout.verifyNow}
                </Button>
              </span>
            )}
          </Row>
        </dl>
        <p className="m-0 text-sm text-fg-subtle">{t.auth.roleFixedNote}</p>
      </Card>

      <Card padding="normal" className="gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{s.appearance}</h2>
        <Segmented<Theme>
          options={[
            { value: 'light', label: s.light },
            { value: 'dark', label: s.dark },
          ]}
          value={theme}
          onChange={setTheme}
          name="settings-theme"
          ariaLabel={s.appearance}
        />
      </Card>

      {isInvestor && (
        <Card padding="normal" className="gap-3">
          <h2 className="text-h4 font-semibold text-fg m-0">{t.shell.nav.premium}</h2>
          <p className="m-0 text-body text-fg-muted">
            {premiumActive ? t.premium.activeUntil(fmtDate(expiry)) : t.dashboard.premiumFreeMatch}
          </p>
          <Button variant="secondary" size="md" className="self-start" onClick={() => navigate('/app/premium')}>
            {premiumActive ? t.premium.renew : t.premium.subscribeNow}
          </Button>
        </Card>
      )}

      <Card padding="normal" className="gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{s.about}</h2>
        <p className="m-0 text-body text-fg-muted">{s.ownershipNote}</p>
        <p className="m-0 text-sm text-fg-subtle">
          {s.chartsBy}{' '}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-fg-link hover:text-fg-link-hover"
          >
            TradingView
            <ArrowUpRightIcon size={16} mirrored={mirrored} aria-hidden="true" />
          </a>
        </p>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/app" className="text-body font-medium text-fg-link hover:text-fg-link-hover">
          {t.common.backToDashboard}
        </Link>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            signOut();
            navigate('/login', { replace: true });
          }}
        >
          {t.shell.logout}
        </Button>
      </div>
    </div>
  );
};
