// src/components/fin/ListingCard.tsx
// Fixed 356px listing card per UI Kit 04-layout-system.md §8.2 & 08-ux §6 Screen 3.2
// Buy is Primary, not gold: a grid of cards must not show several gold buttons (01-color §2).

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SealCheckIcon, InfoIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { Tooltip } from '@/components/ui/Tooltip';
import { Sparkline } from './Sparkline';
import { AssetListing } from '@/lib/types';
import { useNow } from '@/lib/hooks';
import { usePriceHistory } from '@/lib/queries';
import { isPromotedAt } from '@/lib/status';
import { useT } from '@/i18n';

interface ListingCardProps {
  listing: AssetListing;
  onBuy?: (listing: AssetListing) => void;
  className?: string;
  // Sellers see details only (08-ux §6 Screen 3.2)
  isSellerView?: boolean;
  // Static preview (e.g. the new-listing form): no navigation, actions shown disabled
  preview?: boolean;
  // Marketing showcase (landing): no navigation, but the card looks exactly as it does live.
  // The caller makes it non-interactive (inert), so the buttons need no disabled look.
  demo?: boolean;
  // Where "details" leads; sellers open their own listing page
  detailsTo?: string;
}

export const ListingCard: React.FC<ListingCardProps> = ({
  listing,
  onBuy,
  className = '',
  isSellerView = false,
  preview = false,
  demo = false,
  detailsTo,
}) => {
  const t = useT();
  const navigate = useNavigate();
  const promoted = isPromotedAt(listing, useNow(60_000));
  const isStatic = preview || demo;
  // Contract: current_price_per_gram is the buy price; base_price_per_gram is only the
  // reference at creation (the fallback when the market price is unavailable)
  const price = listing.current_price_per_gram ?? listing.base_price_per_gram;
  // 24h sparkline of the karat (contract: "Use 1D for 24h sparklines"); shared per karat
  const history = usePriceHistory(listing.karat, '1D').data;
  const spark = history && history.points.length > 1 ? history.points.map((p) => p.value) : [price, price];
  const title = t.listing.title(listing.karat);

  const openDetails = () => {
    if (!isStatic) navigate(detailsTo ?? `/app/market/${listing.id}`);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isStatic) return;
    if (onBuy) onBuy(listing);
    else navigate(`/app/checkout/${listing.id}`);
  };

  return (
    <Card
      height="listing"
      padding="normal"
      interactive={!isStatic}
      onClick={openDetails}
      isGoldBorder={promoted}
      className={className}
    >
      {/* Chip row (24) */}
      <div className="flex items-center justify-between gap-2 h-8 shrink-0">
        <Chip karat={listing.karat} />
        {promoted && <Badge variant="promoted">{t.listing.promoted}</Badge>}
      </div>

      {/* Title (h4, clamp 1) + seller row */}
      <h4 className="mt-3 text-h4 font-semibold text-fg truncate m-0" title={title}>
        {title}
      </h4>
      <div className="flex items-center gap-2 text-sm text-fg-muted min-w-0 h-6">
        {listing.seller_verified && (
          <SealCheckIcon size={16} weight="fill" className="text-line-focus shrink-0" aria-hidden="true" />
        )}
        <span className="text-fg-subtle shrink-0">{t.listing.seller}</span>
        <span className="font-medium truncate" title={listing.seller_name}>
          {listing.seller_name}
        </span>
      </div>

      {/* 24h karat sparkline (52) */}
      <Sparkline data={spark} height={52} className="mt-5 shrink-0" />

      {/* Figures: labels body-sm, numbers h4 so both columns always fit a 288px card */}
      {/* Each column is bottom-aligned: when a narrow card wraps one label to two lines, the two
          figures still sit on the same baseline */}
      <dl className="mt-5 grid grid-cols-2 gap-3 shrink-0 m-0">
        <div className="min-w-0 flex flex-col justify-end">
          <dt className="flex items-center gap-1 text-sm text-fg-subtle">
            {t.listing.referencePrice}
            <Tooltip content={t.listing.referenceHint}>
              <InfoIcon size={16} className="text-fg-subtle shrink-0" aria-label={t.listing.referenceHint} />
            </Tooltip>
          </dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={price} format="iqd" />
          </dd>
        </div>
        <div className="min-w-0 flex flex-col justify-end">
          <dt className="text-sm text-fg-subtle">{t.listing.available}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={listing.available_weight_grams} format="grams" />
          </dd>
        </div>
      </dl>

      {/* Actions pinned to the bottom (40) */}
      <div className="flex items-center gap-2 mt-auto pt-5 shrink-0">
        <Button
          variant="secondary"
          size="md"
          className="flex-1"
          disabled={preview}
          onClick={(e) => {
            e.stopPropagation();
            openDetails();
          }}
        >
          {t.listing.details}
        </Button>
        {!isSellerView && (
          <Button variant="primary" size="md" className="flex-1" disabled={preview} onClick={handleBuy}>
            {t.listing.buy}
          </Button>
        )}
      </div>
    </Card>
  );
};
