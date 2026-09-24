// src/features/seller/SalesPage.tsx
// Seller sales log per UI Kit 08-ux §11 Screen 8.2 (workflow 08-ب)
// Sellers receive the full principal: commission is paid by the investor on top.

import React from 'react';
import { Link } from 'react-router-dom';
import { ScalesIcon, ReceiptIcon, TagIcon, MegaphoneIcon } from '@phosphor-icons/react';
import { KpiCard } from '@/components/fin/KpiCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { Badge } from '@/components/ui/Badge';
import { Num } from '@/components/ui/Num';
import { TransactionsTable } from '@/features/transactions/TransactionsTable';
import { useMyListings, useTransactions } from '@/lib/queries';
import { useNow } from '@/lib/hooks';
import { isPromotedAt } from '@/lib/status';
import { sumOf } from '@/lib/pricing';
import { dataStatus } from '@/lib/queryStatus';
import { useT } from '@/i18n';

export const SalesPage: React.FC = () => {
  const t = useT();
  const d = t.dashboard;
  const salesQuery = useTransactions();
  const listingsQuery = useMyListings();
  const sales = salesQuery.data ?? [];
  const listings = listingsQuery.data ?? [];
  const now = useNow(60_000);

  // Exact sums (decimal.js), per the contract's rule for arithmetic on money and weights
  const gramsSold = sumOf(sales, 'purchased_weight_grams');
  const received = sumOf(sales, 'principal_amount');

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <KpiCard
          label={d.kpiGramsSold}
          icon={ScalesIcon}
          status={dataStatus(salesQuery)}
          value={<Num value={gramsSold} format="grams" standalone />}
        />
        <KpiCard
          label={d.kpiReceived}
          icon={ReceiptIcon}
          status={dataStatus(salesQuery)}
          value={<Num value={received} format="iqd" standalone />}
          deltaLabel={d.kpiReceivedHelper}
        />
        <KpiCard
          label={d.kpiActive}
          icon={TagIcon}
          status={dataStatus(listingsQuery)}
          value={<Num value={listings.filter((l) => l.status === 'active').length} format="plain" standalone />}
        />
        <KpiCard
          label={d.kpiPromoted}
          icon={MegaphoneIcon}
          status={dataStatus(listingsQuery)}
          value={<Num value={listings.filter((l) => isPromotedAt(l, now)).length} format="plain" standalone />}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{t.sales.salesTitle}</h2>
        <TransactionsTable
          transactions={sales}
          viewer="seller"
          loading={salesQuery.isPending}
          isError={salesQuery.isError}
          onRetry={() => salesQuery.refetch()}
          emptyMessage={t.sales.empty}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 h-11">
          <h2 className="text-h4 font-semibold text-fg m-0">{t.sales.listingsTitle}</h2>
          <Link to="/app/listings" className="text-body font-medium text-fg-link hover:text-fg-link-hover">
            {t.sales.manage}
          </Link>
        </div>
        {listingsQuery.isError ? (
          <ErrorState message={t.sellerListings.loadFailed} onRetry={() => listingsQuery.refetch()} />
        ) : (
          <ul className="m-0 p-0 list-none rounded-md bg-surface-1 border border-line divide-y divide-line-subtle">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/app/listings/${l.id}`}
                  className="min-h-16 px-5 py-2 flex items-center justify-between gap-3 hover:bg-state-hover outline-none focus-visible:bg-state-hover"
                >
                  <span className="flex flex-col min-w-0">
                    <span className="text-body font-medium text-fg truncate">{t.listing.title(l.karat)}</span>
                    <span className="text-sm text-fg-subtle">
                      {t.sales.remaining} <Num value={l.available_weight_grams} format="grams" /> /{' '}
                      <Num value={l.total_weight_grams} format="grams" />
                    </span>
                  </span>
                  {l.status === 'active' ? (
                    <Badge variant="success">{t.status.active}</Badge>
                  ) : l.status === 'suspended' ? (
                    <Badge variant="suspended">{t.status.suspended}</Badge>
                  ) : (
                    <Badge variant="soldOut">{t.status.soldOut}</Badge>
                  )}
                </Link>
              </li>
            ))}
            {!listingsQuery.isPending && listings.length === 0 && (
              <li className="p-5 text-body text-fg-subtle text-center">{t.sellerListings.empty}</li>
            )}
          </ul>
        )}
      </section>
    </div>
  );
};
