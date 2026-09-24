// src/features/seller/SellerListingDetailPage.tsx
// One of the seller's listings: status, remaining weight, promotion and its sales (workflow 06, 08-ب)

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Num } from '@/components/ui/Num';
import { ErrorState } from '@/components/ui/ErrorState';
import { TransactionsTable } from '@/features/transactions/TransactionsTable';
import { ListingLoadError } from '@/features/market/ListingLoadError';
import { useAppContext } from '@/features/shell/appContext';
import { useListing, useTransactions } from '@/lib/queries';
import { useMirrored } from '@/lib/direction';
import { fmtDate } from '@/lib/formatters';
import { useNow } from '@/lib/hooks';
import { isPromotedAt } from '@/lib/status';
import { useT } from '@/i18n';

export const SellerListingDetailPage: React.FC = () => {
  const t = useT();
  const s = t.sellerListing;
  const mirrored = useMirrored();
  const { id } = useParams<{ id: string }>();
  const { user } = useAppContext();
  const listingQuery = useListing(id);
  const salesQuery = useTransactions();
  const listing = listingQuery.data;
  const now = useNow(60_000);

  const back = (
    <Link
      to="/app/listings"
      className="self-start inline-flex items-center gap-2 text-body font-medium text-fg-link hover:text-fg-link-hover"
    >
      <ArrowLeftIcon size={16} mirrored={mirrored} aria-hidden="true" />
      {s.back}
    </Link>
  );

  if (listingQuery.isPending) return <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />;

  if (listingQuery.isError) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <ListingLoadError
          error={listingQuery.error}
          onRetry={() => listingQuery.refetch()}
          backTo="/app/listings"
          backLabel={s.back}
        />
      </div>
    );
  }

  // Only the owner sees this page (mirrors the server's ownership check)
  if (!listing || listing.seller_id !== user.id) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <ErrorState message={t.detail.notFound} />
      </div>
    );
  }

  const sales = (salesQuery.data ?? []).filter((tx) => tx.asset_id === listing.id);
  const sold = listing.total_weight_grams - listing.available_weight_grams;
  const promotedUntil = isPromotedAt(listing, now) ? listing.promotion_expiry_date : null;

  return (
    <div className="flex flex-col gap-5">
      {back}
      <Card padding="spacious" className="gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Chip karat={listing.karat} />
          {listing.status === 'active' && <Badge variant="success">{t.status.active}</Badge>}
          {listing.status === 'suspended' && <Badge variant="suspended">{t.status.suspended}</Badge>}
          {listing.status === 'sold_out' && <Badge variant="soldOut">{t.status.soldOut}</Badge>}
          {promotedUntil && <Badge variant="promoted">{s.promotedUntil(fmtDate(promotedUntil))}</Badge>}
        </div>
        <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{t.listing.title(listing.karat)}</h1>
        <dl className="m-0 grid grid-cols-2 md:grid-cols-4 gap-5 pt-5 border-t border-line-subtle">
          {[
            [t.listing.available, <Num value={listing.available_weight_grams} format="grams" />],
            [s.sold, <Num value={sold} format="grams" />],
            [t.detail.totalWeight, <Num value={listing.total_weight_grams} format="grams" />],
            [t.listing.referencePrice, <Num value={listing.base_price_per_gram} format="iqd" />],
          ].map(([label, value], i) => (
            <div key={i}>
              <dt className="text-sm text-fg-subtle">{label}</dt>
              <dd className="m-0 text-h4 font-semibold text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 text-sm text-fg-subtle">{s.createdAt(fmtDate(listing.created_at))}</p>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-semibold text-fg m-0">{s.salesTitle}</h2>
        <TransactionsTable
          transactions={sales}
          viewer="seller"
          loading={salesQuery.isPending}
          isError={salesQuery.isError}
          onRetry={() => salesQuery.refetch()}
          emptyMessage={t.sales.empty}
        />
      </section>
    </div>
  );
};
