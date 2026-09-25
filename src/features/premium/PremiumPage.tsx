// src/features/premium/PremiumPage.tsx
// Premium offer + mock-payment subscribe dialog per UI Kit 08-ux §10 Screen 7.1, Dialog 7.2
// (workflow 07). Dates mirror the server rule: an active plan extends from its current
// expiry, an expired/absent one starts today.

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CrownIcon, BellIcon, TrendUpIcon, ChartLineUpIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { Num } from '@/components/ui/Num';
import { toast } from '@/components/ui/toastStore';
import { useAppContext } from '@/features/shell/appContext';
import { api, isApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queries';
import { useServerConfig } from '@/lib/queries';
import { isolateFigures } from '@/lib/bidi';
import { useNow } from '@/lib/hooks';
import { isPremiumActive, premiumExpiry } from '@/lib/status';
import { fmtDate, fmtIQD } from '@/lib/formatters';
import { useT } from '@/i18n';

const DAY_MS = 86_400_000;

export const PremiumPage: React.FC = () => {
  const t = useT();
  const p = t.premium;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAppContext();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Price and duration from GET /api/config (displayed, never hard-coded)
  const config = useServerConfig().data;
  const price = config?.subscription_price_iqd;
  const durationDays = config?.subscription_duration_days ?? 0;
  const now = useNow(60_000);
  const expiry = premiumExpiry(user);
  const active = isPremiumActive(user);
  const start = active ? expiry : now;
  const end = start + durationDays * DAY_MS;

  const benefits = [
    { icon: BellIcon, title: p.alerts, body: p.alertsBody },
    { icon: TrendUpIcon, title: p.trend, body: p.trendBody },
    { icon: ChartLineUpIcon, title: p.report, body: p.reportBody },
  ];

  const subscribe = async () => {
    setBusy(true);
    setError('');
    try {
      await api.subscribePremium();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.me }),
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription }),
        queryClient.invalidateQueries({ queryKey: queryKeys.insights }),
      ]);
      setOpen(false);
      toast.success(p.subscribed);
      navigate('/app/insights');
    } catch (err) {
      // Mock payment failed: the plan stays unchanged (workflow 07)
      setError(isApiError(err) && err.message ? err.message : p.subscribeFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-g6 flex flex-col gap-5">
      <Card height="listing" stackedHeight="auto" padding="spacious" isGoldBorder className="justify-between gap-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <CrownIcon size={32} className="text-fg-gold" aria-hidden="true" />
            <h1 className="text-h3 font-semibold text-fg m-0 whitespace-nowrap">{t.shell.nav.premium}</h1>
          </div>
          <p className="m-0 sm:text-end">
            <span className="text-h3 font-semibold text-fg">
              {price === undefined ? (
                <span className="inline-block h-4 w-16 align-middle rounded-xs skeleton-loading" aria-hidden="true" />
              ) : (
                <Num value={price} format="iqd" />
              )}
            </span>
            <span className="block text-sm text-fg-subtle">{p.perMonth}</span>
          </p>
        </div>

        <ul className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-3 gap-5">
          {benefits.map(({ icon: IconComponent, title, body }) => (
            <li key={title} className="flex flex-col gap-1">
              <IconComponent size={24} className="text-fg-muted" aria-hidden="true" />
              <span className="text-body font-semibold text-fg">{title}</span>
              <span className="text-sm text-fg-muted">{body}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="m-0 text-sm text-fg-subtle">
            {active ? p.activeUntil(fmtDate(expiry)) : t.dashboard.premiumFreeMatch}
          </p>
          <Button variant="accent" size="lg" onClick={() => setOpen(true)}>
            {active ? p.renew : p.subscribeNow}
          </Button>
        </div>
      </Card>

      {active && (
        <Link to="/app/insights" className="self-start text-body font-medium text-fg-link hover:text-fg-link-hover">
          {p.openInsights}
        </Link>
      )}

      <Dialog isOpen={open} onClose={() => setOpen(false)} size="md" title={p.dialogTitle}>
        <div className="flex flex-col gap-5">
          <dl className="m-0 rounded-sm bg-muted border border-line-subtle px-4 py-2">
            <div className="flex items-center justify-between gap-3 h-11">
              <dt className="text-body text-fg-muted">{p.price}</dt>
              <dd className="m-0 text-body font-semibold text-fg">
                {price === undefined ? (
                  <span className="inline-block h-4 w-16 align-middle rounded-xs skeleton-loading" aria-hidden="true" />
                ) : (
                  <Num value={price} format="iqd" />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 h-11">
              <dt className="text-body text-fg-muted">{p.period}</dt>
              <dd className="m-0 text-body font-semibold text-fg">{t.sellerListings.days(durationDays)}</dd>
            </div>
          </dl>

          <p className="m-0 text-body text-fg">
            {active ? p.extendLine(fmtDate(start), fmtDate(end)) : p.startLine(fmtDate(end))}
          </p>

          <Badge variant="info" className="self-start">
            {t.sellerListings.mockPayment}
          </Badge>

          {error && (
            <p role="alert" className="m-0 text-sm font-medium text-danger-fg">
              {isolateFigures(error)}
            </p>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button variant="accent" loading={busy} disabled={price === undefined} onClick={subscribe}>
              {p.confirm} · <bdi className="num">{fmtIQD(price ?? 0)}</bdi> {t.units.iqd}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
