// src/features/auth/DashboardHome.tsx
// First dashboard per role: UI Kit 04-layout T1 & 08-ux §4 Screen 1.4 (workflow 01, step 4)

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  WalletIcon,
  CoinsIcon,
  ClockCounterClockwiseIcon,
  CrownIcon,
  TargetIcon,
  TagIcon,
  ReceiptIcon,
  MegaphoneIcon,
  ScalesIcon,
  CheckSquareIcon,
  SquareIcon,
  XIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import { LivePricePanel } from '@/components/fin/LivePricePanel';
import { KpiCard } from '@/components/fin/KpiCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { ListingCard } from '@/components/fin/ListingCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Num } from '@/components/ui/Num';
import { Tooltip } from '@/components/ui/Tooltip';
import { useAppContext } from '@/features/shell/appContext';
import { useListings, useMyListings, useOwnership, useTransactions } from '@/lib/queries';
import { holdingsValue, sumOf } from '@/lib/pricing';
import { fmtAmountWords, fmtDate, fmtDateNumeric } from '@/lib/formatters';
import { useOnboarding } from '@/lib/onboarding';
import { useNow } from '@/lib/hooks';
import { isPremiumActive, isPromotedAt } from '@/lib/status';
import { Transaction, User, MarketPrices } from '@/lib/types';
import { dataStatus } from '@/lib/queryStatus';
import { useT } from '@/i18n';

const BUDGET_CHIPS = [500_000, 1_000_000, 5_000_000];

const SectionHeader: React.FC<{ title: string; to: string; linkLabel: string }> = ({ title, to, linkLabel }) => (
  <div className="flex items-center justify-between gap-3 h-11">
    <h2 className="text-h4 font-semibold text-fg m-0">{title}</h2>
    <Link to={to} className="text-body font-medium text-fg-link hover:text-fg-link-hover">
      {linkLabel}
    </Link>
  </div>
);

// ---------------------------------------------------------------------------
// Investor (T1)
// ---------------------------------------------------------------------------
const InvestorDashboard: React.FC<{ user: User; prices: MarketPrices }> = ({ user, prices }) => {
  const t = useT();
  const d = t.dashboard;
  const navigate = useNavigate();
  const [budget, setBudget] = useState(1_000_000);

  // Only the two featured cards are needed: ask the server for a page of 2
  const listingsQuery = useListings({ sort: 'promoted_first' }, 2);
  const ownershipQuery = useOwnership(user.role);
  const txQuery = useTransactions();
  const listings = listingsQuery.data?.pages[0]?.items ?? [];
  const transactions = txQuery.data ?? [];
  const onboarding = useOnboarding(user.id);

  const grams = ownershipQuery.data?.total_accumulated_grams ?? 0;
  const value = holdingsValue(transactions, prices);
  const premiumActive = isPremiumActive(user);
  // Only a history that actually loaded empty makes this a new investor
  const showStartHere = txQuery.isSuccess && transactions.length === 0 && !onboarding.dismissed;

  return (
    <div className="flex flex-col gap-8">
      {/* Row 1 (356): live price panel 1.618fr + Smart Match quick panel 1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-5 lg:gap-8">
        <LivePricePanel prices={prices} />

        <Card height="listing" stackedHeight="auto" padding="normal" className="gap-5">
          <div className="flex items-start gap-3">
            <span className="size-12 shrink-0 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-muted">
              <TargetIcon size={24} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="text-h4 font-semibold text-fg m-0">{d.matchTitle}</h2>
              <p className="m-0 text-sm text-fg-subtle flex items-center gap-1">
                {d.riskLine(t.auth.riskName[user.risk_profile ?? 'medium'])}
                <Tooltip content={d.riskTooltip}>
                  <InfoIcon size={16} aria-label={d.riskTooltip} />
                </Tooltip>
              </p>
            </div>
          </div>

          <MoneyInput
            label={d.budgetLabel}
            value={budget}
            onChangeValue={setBudget}
            suggestions={BUDGET_CHIPS}
            suggestionLabel={(v) => `${fmtAmountWords(v)} ${t.units.iqd}`}
          />

          <Button
            variant="accent"
            size="lg"
            fullWidth
            disabled={budget <= 0}
            onClick={() => navigate('/app/match', { state: { initialBudget: budget } })}
            className="mt-auto"
          >
            {d.startMatch}
          </Button>
        </Card>
      </div>

      {/* Row 2 (136): four KPIs, 2×2 on mobile */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <KpiCard
          label={d.kpiGrams}
          icon={CoinsIcon}
          status={dataStatus(ownershipQuery)}
          value={<Num value={grams} format="grams" standalone countUp />}
          deltaLabel={grams > 0 ? d.kpiGramsSigned : d.kpiGramsEmpty}
        />
        <KpiCard
          label={d.kpiValue}
          icon={WalletIcon}
          status={dataStatus(txQuery)}
          value={<Num value={value} format="iqd" standalone countUp />}
          deltaPct={value > 0 && prices.change_24h_pct !== null ? prices.change_24h_pct : undefined}
          deltaLabel={value > 0 ? t.kpi.sinceYesterday : d.kpiValueEmpty}
        />
        <KpiCard
          label={d.kpiTransactions}
          icon={ClockCounterClockwiseIcon}
          status={dataStatus(txQuery)}
          value={<Num value={transactions.length} format="plain" standalone countUp />}
          deltaLabel={d.kpiTransactionsHelper}
        />
        <KpiCard
          label={d.kpiPremium}
          icon={CrownIcon}
          value={premiumActive ? d.premiumActive : d.premiumInactive}
          deltaLabel={premiumActive ? d.premiumUntil(fmtDate(user.subscription_expiry_date!)) : d.premiumFreeMatch}
          deltaLabelShort={premiumActive ? d.premiumUntil(fmtDateNumeric(user.subscription_expiry_date!)) : undefined}
        />
      </div>

      {/* Row 3 (356): featured listings 1.618fr + recent transactions / start-here 1fr */}
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-5 lg:gap-8">
        <section className="flex flex-col gap-3 min-w-0">
          <SectionHeader title={d.featured} to="/app/market" linkLabel={d.viewMarket} />
          {/* Mobile: horizontal snap list of fixed 300×356 cards (04-layout T1) */}
          {listingsQuery.isError ? (
            <ErrorState height="listing" message={t.marketPage.loadFailed} onRetry={() => listingsQuery.refetch()} />
          ) : (
            <div className="flex md:grid md:grid-cols-2 gap-5 overflow-x-auto md:overflow-visible snap-x snap-mandatory -mx-5 px-5 md:mx-0 md:px-0">
              {listingsQuery.isPending
                ? [0, 1].map((i) => (
                    <div
                      key={i}
                      className="h-g4 w-75 md:w-auto shrink-0 rounded-md skeleton-loading"
                      aria-hidden="true"
                    />
                  ))
                : listings
                    .slice(0, 2)
                    .map((item) => (
                      <ListingCard key={item.id} listing={item} className="w-75 md:w-auto shrink-0 snap-start" />
                    ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-3 min-w-0">
          {showStartHere ? (
            <>
              <div className="flex items-center justify-between gap-3 h-11">
                <h2 className="text-h4 font-semibold text-fg m-0">{d.startHere}</h2>
                <button
                  type="button"
                  onClick={onboarding.dismiss}
                  aria-label={t.common.close}
                  className="size-11 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
                >
                  <XIcon size={20} />
                </button>
              </div>
              <Card height="small" padding="normal" className="justify-center gap-4">
                {[
                  { done: onboarding.pricesSeen, label: d.stepPrices },
                  { done: onboarding.matchTried, label: d.stepMatch },
                  { done: transactions.length > 0, label: d.stepBuy },
                ].map((step) => (
                  <p
                    key={step.label}
                    className={`m-0 flex items-center gap-3 text-body ${step.done ? 'text-fg-subtle' : 'text-fg'}`}
                  >
                    {step.done ? (
                      <CheckSquareIcon
                        size={20}
                        weight="fill"
                        className="text-success-fg shrink-0"
                        aria-label={d.done}
                      />
                    ) : (
                      <SquareIcon size={20} className="text-fg-subtle shrink-0" aria-hidden="true" />
                    )}
                    {step.label}
                  </p>
                ))}
              </Card>
            </>
          ) : (
            <>
              <SectionHeader title={d.recent} to="/app/transactions" linkLabel={d.fullHistory} />
              {txQuery.isError ? (
                <ErrorState height="listing" message={t.history.loadFailed} onRetry={() => txQuery.refetch()} />
              ) : txQuery.isPending ? (
                <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
              ) : (
                <Card height="listing" stackedHeight="auto" padding="compact" className="overflow-y-auto">
                  {transactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <p className="m-0 text-body text-fg-subtle">{d.noTransactions}</p>
                      <Button variant="secondary" size="md" onClick={() => navigate('/app/market')}>
                        {d.viewMarket}
                      </Button>
                    </div>
                  ) : (
                    <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
                      {transactions.slice(0, 5).map((tx) => (
                        <RecentRow key={tx.id} tx={tx} />
                      ))}
                    </ul>
                  )}
                </Card>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const RecentRow: React.FC<{ tx: Transaction }> = ({ tx }) => {
  const t = useT();
  return (
    <li className="flex items-center justify-between gap-3 min-h-16 py-2">
      <div className="min-w-0">
        <p className="m-0 text-body font-medium text-fg">
          <Num value={tx.purchased_weight_grams} format="grams" /> · {t.units.karat(tx.karat)}
        </p>
        <p className="m-0 text-sm text-fg-subtle truncate">{fmtDate(tx.created_at)}</p>
      </div>
      <p className="m-0 text-body font-medium text-fg shrink-0">
        <Num value={tx.total_paid_by_investor} format="iqd" />
      </p>
    </li>
  );
};

// ---------------------------------------------------------------------------
// Seller
// ---------------------------------------------------------------------------
const SellerDashboard: React.FC<{ prices: MarketPrices }> = ({ prices }) => {
  const t = useT();
  const d = t.dashboard;
  const navigate = useNavigate();
  const listingsQuery = useMyListings();
  const salesQuery = useTransactions();
  const listings = listingsQuery.data ?? [];
  const sales = salesQuery.data ?? [];

  // Exact sums (decimal.js), per the contract's rule for arithmetic on money and weights
  const gramsSold = sumOf(sales, 'purchased_weight_grams');
  const received = sumOf(sales, 'principal_amount');
  const active = listings.filter((l) => l.status === 'active').length;
  const now = useNow(60_000);
  const promoted = listings.filter((l) => isPromotedAt(l, now)).length;

  if (listingsQuery.isPending) return <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />;

  // A failed load is not "no listings yet": inviting a first listing here would mislead
  if (listingsQuery.isError) {
    return (
      <ErrorState height="listing" message={t.sellerListings.loadFailed} onRetry={() => listingsQuery.refetch()} />
    );
  }

  // Empty state hero (08-ux §4 Screen 1.4): one action + the price the seller will get
  if (listings.length === 0) {
    return (
      <Card height="listing" padding="spacious" className="items-center justify-center text-center gap-5">
        <span className="size-16 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-muted">
          <TagIcon size={32} aria-hidden="true" />
        </span>
        <h2 className="text-h3 font-semibold text-fg m-0">{d.sellerEmpty}</h2>
        <Button variant="accent" size="lg" onClick={() => navigate('/app/listings/new')}>
          {d.sellerFirstListing}
        </Button>
        <p className="m-0 text-body text-fg-muted">
          {d.sellerReference(t.units.karat(21))} <Num value={prices.price_21k} format="iqd" /> {d.perGram}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <KpiCard
          label={d.kpiGramsSold}
          icon={ScalesIcon}
          status={dataStatus(salesQuery)}
          value={<Num value={gramsSold} format="grams" standalone countUp />}
        />
        <KpiCard
          label={d.kpiReceived}
          icon={ReceiptIcon}
          status={dataStatus(salesQuery)}
          value={<Num value={received} format="iqd" standalone countUp />}
          deltaLabel={d.kpiReceivedHelper}
        />
        <KpiCard label={d.kpiActive} icon={TagIcon} value={<Num value={active} format="plain" standalone countUp />} />
        <KpiCard
          label={d.kpiPromoted}
          icon={MegaphoneIcon}
          value={<Num value={promoted} format="plain" standalone countUp />}
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-h4 font-semibold text-fg m-0">{d.myListings}</h2>
          <Button variant="accent" size="md" onClick={() => navigate('/app/listings/new')}>
            {d.addListing}
          </Button>
        </div>
        <div className="card-grid-listings">
          {listings.map((item) => (
            <ListingCard key={item.id} listing={item} isSellerView detailsTo={`/app/listings/${item.id}`} />
          ))}
        </div>
      </section>
    </div>
  );
};

export const DashboardHome: React.FC = () => {
  const { user, prices } = useAppContext();
  return user.role === 'investor' ? (
    <InvestorDashboard user={user} prices={prices} />
  ) : (
    <SellerDashboard prices={prices} />
  );
};
