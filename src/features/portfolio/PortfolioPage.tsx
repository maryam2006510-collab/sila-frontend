// src/features/portfolio/PortfolioPage.tsx
// Investor portfolio per UI Kit 04-layout T5 & 08-ux §11 Screen 8.1 (workflow 08-أ)
// The balance is shown only after the server verifies its signature; on
// INTEGRITY_CHECK_FAILED every balance figure (hero, allocation, balance chart) is hidden.
// The permanent purchase history stays visible.

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretUpIcon, CaretDownIcon, CrownIcon, ShieldWarningIcon, InfoIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { toast } from '@/components/ui/toastStore';
import { SignatureCard } from '@/components/fin/SignatureCard';
import { AllocationBar } from '@/components/fin/AllocationBar';
import { PriceChart, PricePoint } from '@/components/fin/PriceChart';
import { ErrorState } from '@/components/ui/ErrorState';
import { TransactionsTable } from '@/features/transactions/TransactionsTable';
import { useAppContext } from '@/features/shell/appContext';
import { hasErrorCode } from '@/lib/api';
import { useOwnership, useTransactions } from '@/lib/queries';
import { holdingsByKarat, holdingsValue } from '@/lib/pricing';
import { fmtDate, fmtGrams, fmtPct } from '@/lib/formatters';
import { useNow } from '@/lib/hooks';
import { isPremiumActive, premiumExpiry } from '@/lib/status';
import { Transaction } from '@/lib/types';
import { useT } from '@/i18n';

const EXPIRY_WARNING_MS = 3 * 86_400_000;

const DAY_S = 86_400;
// The chart always spans at least a week, so a fresh first purchase reads as a date, not seconds
const MIN_SPAN_S = 7 * DAY_S;

// Verified balance over time from the permanent purchase history (real data only).
// One point per day: Lightweight Charts spaces points evenly, so irregular purchase
// timestamps would stretch a two-second gap across half the chart.
const balanceSeries = (transactions: Transaction[], nowMs: number): PricePoint[] => {
  if (!transactions.length) return [];
  const purchases = transactions
    .map((tx) => ({ at: Math.floor(new Date(tx.created_at).getTime() / 1000), grams: tx.purchased_weight_grams }))
    .sort((a, b) => a.at - b.at);
  const nowS = Math.floor(nowMs / 1000);
  const dayStart = (s: number) => s - (s % DAY_S);
  const today = dayStart(nowS);
  const first = Math.min(dayStart(purchases[0].at) - DAY_S, today - MIN_SPAN_S);

  const points: PricePoint[] = [];
  let running = 0;
  let next = 0;
  for (let day = first; day <= today; day += DAY_S) {
    // Balance at the close of that day (today: right now)
    const close = Math.min(day + DAY_S - 1, nowS);
    while (next < purchases.length && purchases[next].at <= close) running += purchases[next++].grams;
    points.push({ time: day, value: Math.round(running * 1000) / 1000 });
  }
  return points;
};

export const PortfolioPage: React.FC = () => {
  const t = useT();
  const p = t.portfolio;
  const navigate = useNavigate();
  const { user, prices } = useAppContext();
  const ownershipQuery = useOwnership(user.role);
  const txQuery = useTransactions();
  const transactions = useMemo(() => txQuery.data ?? [], [txQuery.data]);

  const now = useNow(60_000);
  const series = useMemo(() => balanceSeries(transactions, now), [transactions, now]);
  const integrityFailed = hasErrorCode(ownershipQuery.error, 'INTEGRITY_CHECK_FAILED');
  const grams = ownershipQuery.data?.total_accumulated_grams ?? 0;
  const value = holdingsValue(transactions, prices);
  // null until the server has 24h of prices: then the "today" figure is not shown at all
  const change = prices.change_24h_pct;
  const todayChange = change === null ? null : Math.round(value - value / (1 + change));
  const isUp = (change ?? 0) >= 0;
  const ownership = ownershipQuery.data;
  const Caret = isUp ? CaretUpIcon : CaretDownIcon;

  const expiry = premiumExpiry(user);
  const premiumActive = isPremiumActive(user);
  const expiringSoon = premiumActive && expiry - now < EXPIRY_WARNING_MS;

  const contactSupport = () => toast.info(p.supportRequested);

  // ---- Row 1: verified holdings hero (focal) + signature card ----------
  const hero = integrityFailed ? (
    <Card
      height="listing"
      padding="spacious"
      role="alert"
      className="justify-center gap-4 bg-danger-bg border-danger-line"
    >
      <ShieldWarningIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
      <h1 className="text-h3 font-semibold text-danger-fg m-0">{t.signature.failedTitle}</h1>
      <p className="m-0 text-body text-fg-muted">{t.signature.failedBody}</p>
      <Button variant="danger" size="lg" className="self-start" onClick={contactSupport}>
        {t.signature.contactSupport}
      </Button>
    </Card>
  ) : ownershipQuery.isPending ? (
    <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
  ) : ownershipQuery.isError ? (
    <ErrorState height="listing" message={p.loadFailed} onRetry={() => ownershipQuery.refetch()} />
  ) : (
    <Card height="listing" padding="spacious" className="justify-between">
      <div>
        <p className="m-0 text-body text-fg-muted">{p.holdings}</p>
        <p className="m-0 text-h1 font-bold text-fg">
          <Num value={grams} format="grams" standalone />
        </p>
        {/* Contract §4 Ownership: the disclaimer is always shown next to the balance */}
        {ownership?.disclaimer && (
          <p className="m-0 mt-2 flex items-start gap-2 text-sm text-fg-subtle">
            <InfoIcon size={16} className="shrink-0 mt-1" aria-hidden="true" />
            {ownership.disclaimer}
          </p>
        )}
      </div>

      {grams > 0 ? (
        <dl className="m-0 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          <div>
            <dt className="text-sm text-fg-subtle">{p.valueNow}</dt>
            <dd className="m-0 text-h3 font-semibold text-fg">
              <Num value={value} format="iqd" />
            </dd>
          </div>
          {todayChange !== null && change !== null && (
            <div>
              <dt className="text-sm text-fg-subtle">{p.today}</dt>
              <dd
                className={`m-0 text-h4 font-semibold flex flex-wrap items-center gap-1 ${isUp ? 'text-up' : 'text-down'}`}
              >
                <Caret size={16} weight="fill" aria-hidden="true" />
                <Num value={todayChange} format="iqd" /> <bdi className="num text-sm">({fmtPct(change)})</bdi>
              </dd>
            </div>
          )}
        </dl>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-body text-fg-muted">{ownership?.message || p.empty}</p>
          <Button variant="primary" size="lg" onClick={() => navigate('/app/market')}>
            {t.dashboard.kpiGramsEmpty}
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-5 lg:gap-8">
        {hero}
        <SignatureCard
          height="listing"
          token={ownership?.digital_signature_token ?? undefined}
          verified={Boolean(ownershipQuery.data?.verified)}
          isIntegrityFailed={integrityFailed}
          onContactSupport={contactSupport}
          pending={ownershipQuery.isPending}
        />
      </div>

      {/* Row 2 (reversed split): allocation 1fr + balance over time 1.618fr. Hidden if integrity failed. */}
      {!integrityFailed && transactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-golden-rev gap-5 lg:gap-8 items-stretch">
          {/* Same height as the chart beside it on desktop */}
          <AllocationBar allocations={holdingsByKarat(transactions)} className="lg:h-auto" />
          <Card padding="normal" className="gap-3">
            <h2 className="text-h4 font-semibold text-fg m-0">{p.balanceOverTime}</h2>
            <PriceChart
              data={series}
              height={220}
              formatValue={(v) => `${fmtGrams(v)} ${t.units.grams}`}
              ariaLabel={p.balanceChartLabel(fmtGrams(grams))}
            />
          </Card>
        </div>
      )}

      {/* Subscription summary (workflow 08-أ step 3) */}
      <section className="rounded-md bg-surface-1 border border-line p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CrownIcon size={24} className="text-fg-gold shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="m-0 text-body font-semibold text-fg">{t.dashboard.kpiPremium}</p>
            <p className={`m-0 text-sm flex items-center gap-1 ${expiringSoon ? 'text-info-fg' : 'text-fg-subtle'}`}>
              {expiringSoon && <InfoIcon size={16} weight="fill" aria-hidden="true" />}
              {premiumActive
                ? expiringSoon
                  ? p.expiresSoon(fmtDate(expiry))
                  : p.activeUntil(fmtDate(expiry))
                : t.dashboard.premiumFreeMatch}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="md" onClick={() => navigate('/app/premium')}>
          {premiumActive ? p.renew : p.upgrade}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{t.history.title}</h2>
        <TransactionsTable
          transactions={transactions}
          viewer="investor"
          loading={txQuery.isPending}
          isError={txQuery.isError}
          onRetry={() => txQuery.refetch()}
        />
      </section>
    </div>
  );
};
