// src/features/market/ListingDetailPage.tsx
// Listing detail per UI Kit 04-layout T3 & 08-ux §6 Screen 3.3 (workflow 03, step 3)
// Main: details + karat chart. Aside (sticky): live price, grams, estimate, buy.

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeftIcon, SealCheckIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PriceChart } from '@/components/fin/PriceChart';
import { OrderEstimate } from '@/components/fin/OrderEstimate';
import { gramsError } from '@/lib/validation';
import { useAppContext } from '@/features/shell/appContext';
import { useListing, usePriceHistory } from '@/lib/queries';
import { livePriceFor } from '@/lib/pricing';
import { fmtNumber } from '@/lib/formatters';
import { useMirrored } from '@/lib/direction';
import { useNow } from '@/lib/hooks';
import { isPromotedAt } from '@/lib/status';
import { useT } from '@/i18n';
import { ListingLoadError } from './ListingLoadError';

const GRAM_CHIPS = [5, 10, 25, 50];

export const ListingDetailPage: React.FC = () => {
  const t = useT();
  const d = t.detail;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const mirrored = useMirrored();
  const { user, prices } = useAppContext();
  const now = useNow(60_000);

  const listingQuery = useListing(id);
  const listing = listingQuery.data;
  const [grams, setGrams] = useState<number | null>(null);

  const livePrice = listing ? livePriceFor(prices, listing.karat) : 0;
  // The karat's real month of prices (GET /api/market/prices/history)
  const chartData = usePriceHistory(listing?.karat, '1M').data?.points ?? [];

  if (listingQuery.isPending) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-8" aria-busy="true">
        <div className="h-g5 rounded-md skeleton-loading" aria-hidden="true" />
        <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
      </div>
    );
  }

  if (!listing) return <ListingLoadError error={listingQuery.error} onRetry={() => listingQuery.refetch()} />;

  const quantity = grams ?? Math.min(10, listing.available_weight_grams);
  const qtyError = gramsError(quantity, listing.available_weight_grams, t);
  const isInvestor = user.role === 'investor';
  const isActive = listing.status === 'active';

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/app/market"
        className="self-start inline-flex items-center gap-2 text-body font-medium text-fg-link hover:text-fg-link-hover"
      >
        <ArrowLeftIcon size={16} mirrored={mirrored} aria-hidden="true" />
        {d.backToMarket}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-golden gap-8 items-start">
        {/* Main */}
        <div className="flex flex-col gap-5 min-w-0">
          <Card padding="spacious" className="gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Chip karat={listing.karat} />
              {isPromotedAt(listing, now) && <Badge variant="promoted">{t.listing.promoted}</Badge>}
              {listing.status === 'sold_out' && <Badge variant="soldOut">{t.status.soldOut}</Badge>}
              {listing.status === 'suspended' && <Badge variant="suspended">{t.status.suspended}</Badge>}
            </div>

            <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{t.listing.title(listing.karat)}</h1>

            <p className="m-0 flex items-center gap-2 text-body text-fg-muted">
              {listing.seller_verified && (
                <SealCheckIcon
                  size={20}
                  weight="fill"
                  className="text-line-focus shrink-0"
                  aria-label={t.shell.verified}
                />
              )}
              {t.listing.seller} <span className="font-medium text-fg">{listing.seller_name}</span>
            </p>

            <dl className="m-0 grid grid-cols-2 md:grid-cols-3 gap-5 pt-5 border-t border-line-subtle">
              <div>
                <dt className="text-sm text-fg-subtle">{t.listing.available}</dt>
                <dd className="m-0 text-h4 font-semibold text-fg">
                  <Num value={listing.available_weight_grams} format="grams" />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-fg-subtle">{d.totalWeight}</dt>
                <dd className="m-0 text-h4 font-semibold text-fg">
                  <Num value={listing.total_weight_grams} format="grams" />
                </dd>
              </div>
              <div>
                <dt className="text-sm text-fg-subtle">{t.listing.referencePrice}</dt>
                <dd className="m-0 text-h4 font-semibold text-fg">
                  <Num value={listing.base_price_per_gram} format="iqd" />
                </dd>
              </div>
            </dl>
          </Card>

          <Card padding="normal" className="gap-3">
            <h2 className="text-h4 font-semibold text-fg m-0">{d.chartTitle(listing.karat)}</h2>
            <PriceChart
              data={chartData}
              height={356}
              ariaLabel={`${t.market.chartLabel(listing.karat)}: ${fmtNumber(livePrice)} ${t.units.iqd}`}
            />
          </Card>
        </div>

        {/* Aside: sticky order panel */}
        <aside className="lg:sticky lg:top-24">
          <Card padding="normal" className="gap-5">
            <div>
              <p className="m-0 text-sm text-fg-subtle">{d.livePrice(listing.karat)}</p>
              <p className="m-0 text-h2 font-semibold text-fg-gold">
                <Num value={Math.round(livePrice)} format="iqd" suffix={t.units.perGram} standalone />
              </p>
              <p className="m-0 text-sm text-fg-subtle">{t.listing.referenceHint}</p>
            </div>

            {!isActive ? (
              <p
                role="status"
                className="m-0 p-3 rounded-sm bg-muted border border-line-subtle text-body text-fg-muted"
              >
                {d.notActive}
              </p>
            ) : isInvestor ? (
              <>
                <MoneyInput
                  label={d.gramsLabel}
                  unit={t.units.grams}
                  value={quantity}
                  onChangeValue={setGrams}
                  suggestions={[
                    ...GRAM_CHIPS.filter((g) => g < listing.available_weight_grams),
                    listing.available_weight_grams,
                  ]}
                  suggestionLabel={(g) =>
                    g === listing.available_weight_grams ? d.allQuantity : `${fmtNumber(g)} ${t.units.grams}`
                  }
                  error={qtyError}
                />
                <OrderEstimate grams={qtyError ? 0 : quantity} pricePerGram={livePrice} />
                <Button
                  variant="accent"
                  size="xl"
                  fullWidth
                  disabled={Boolean(qtyError)}
                  onClick={() => navigate(`/app/checkout/${listing.id}`, { state: { initialGrams: quantity } })}
                >
                  {t.listing.buy}
                </Button>
              </>
            ) : (
              <p className="m-0 text-body text-fg-muted">{d.sellerNote}</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
};
