// src/features/landing/ForSellers.tsx
// For sellers per UI Kit 08-ux §12 #8: the real listing card + three facts + "سجّل كبائع".

import React from 'react';
import { ScalesIcon, SealCheckIcon, MegaphoneIcon } from '@phosphor-icons/react';
import { ButtonLink } from '@/components/ui/Button';
import { ListingCard } from '@/components/fin/ListingCard';
import { useListings, useMarketPrices } from '@/lib/queries';
import { AssetListing, MarketPrices } from '@/lib/types';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

const FACT_ICONS = [ScalesIcon, SealCheckIcon, MegaphoneIcon];

// Until the market has a listing, the showcase is an example of the same card: 21K (the most
// traded karat) at the live market price, labelled as an example under the card (D36)
const exampleListing = (prices: MarketPrices, sellerName: string): AssetListing => ({
  id: 'example',
  seller_id: 'example',
  seller_name: sellerName,
  seller_verified: true,
  karat: 21,
  total_weight_grams: 100,
  available_weight_grams: 50,
  base_price_per_gram: prices.price_21k,
  current_price_per_gram: prices.price_21k,
  status: 'active',
  is_promoted: false,
  promotion_expiry_date: null,
  created_at: prices.last_updated,
  updated_at: prices.last_updated,
});

export const ForSellers: React.FC = () => {
  const t = useT();
  // A real listing from the market (GET /api/listings is public), promoted ones first
  const s = t.landing.sellers;
  const listings = useListings({ sort: 'promoted_first' }, 1);
  const prices = useMarketPrices();
  const real = listings.data?.pages[0]?.items[0];
  const example =
    !real && !listings.isPending && prices.data ? exampleListing(prices.data, s.exampleSeller) : undefined;
  const showcase = real ?? example;
  const loading = listings.isPending || (!real && prices.isPending);
  // With neither a listing nor a price there is nothing honest to show: the card column is
  // dropped (never a placeholder that does not resolve) and the facts take the full width
  const showCard = loading || showcase !== undefined;

  return (
    <section
      id="sellers"
      aria-label={s.title}
      className="landing-anchor cv-auto container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34"
    >
      <div className={`grid grid-cols-1 gap-13 items-center ${showCard ? 'lg:grid-cols-golden' : ''}`}>
        <div className="flex flex-col gap-8">
          <h2 data-reveal className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
            {noOrphan(s.title)}
          </h2>
          <ul className="m-0 p-0 list-none flex flex-col gap-5">
            {s.facts.map((fact, i) => {
              const FactIcon = FACT_ICONS[i];
              return (
                <li data-reveal-item key={fact.title} className="flex items-start gap-3">
                  <FactIcon size={24} className="text-fg-muted shrink-0 mt-2" aria-hidden="true" />
                  <div>
                    <h3 className="m-0 text-h4 font-semibold text-fg">{fact.title}</h3>
                    <p className="m-0 max-w-128 text-body text-fg-muted">{fact.body}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <ButtonLink to="/signup/seller" variant="secondary" size="lg" className="self-start">
            {s.cta}
          </ButtonLink>
        </div>

        {/* The same card investors see in the market, with a live listing, not an illustration */}
        {showCard && (
          <div data-reveal-block className="justify-self-center w-full max-w-g4 flex flex-col gap-3">
            <div inert aria-hidden="true">
              {showcase ? (
                <ListingCard listing={showcase} demo />
              ) : (
                <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
              )}
            </div>
            {example && <p className="m-0 text-sm text-fg-subtle text-center">{s.exampleNote}</p>}
          </div>
        )}
      </div>
    </section>
  );
};
