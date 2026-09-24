// src/features/market/MarketPage.tsx
// Market browsing per UI Kit 04-layout T2 & 08-ux §6 Screen 3.2 (workflow 03, step 2)
// Filters live in the URL and are applied by the server (GET /api/listings), which pages the
// results (limit/offset): "عرض المزيد" loads the next page.

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SlidersHorizontalIcon, WarningOctagonIcon, ArrowsDownUpIcon } from '@phosphor-icons/react';
import { ListingCard } from '@/components/fin/ListingCard';
import { Segmented, SegmentOption } from '@/components/ui/Segmented';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Button } from '@/components/ui/Button';
import { useAppContext } from '@/features/shell/appContext';
import { useListings } from '@/lib/queries';
import { KARATS } from '@/lib/pricing';
import { markOnboardingStep } from '@/lib/onboarding';
import { Karat, ListingFilters } from '@/lib/types';
import { useT } from '@/i18n';

const PRICE_DEBOUNCE_MS = 500;

const readNumber = (v: string | null) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? n : undefined;
};

export const MarketPage: React.FC = () => {
  const t = useT();
  const m = t.marketPage;
  const navigate = useNavigate();
  const { user } = useAppContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const karatParam = Number(searchParams.get('karat'));
  const karat = KARATS.includes(karatParam as Karat) ? (karatParam as Karat) : undefined;
  const minPrice = readNumber(searchParams.get('min_price'));
  const maxPrice = readNumber(searchParams.get('max_price'));

  const filters: ListingFilters = { karat, min_price: minPrice, max_price: maxPrice, sort: 'promoted_first' };
  const listingsQuery = useListings(filters);
  const listings = listingsQuery.data?.pages.flatMap((page) => page.items) ?? [];
  // The server's count of every match, not only the pages loaded so far
  const total = listingsQuery.data?.pages[0]?.total ?? 0;
  const hasFilters = Boolean(karat || minPrice || maxPrice);
  const isInvestor = user.role === 'investor';

  useEffect(() => {
    if (isInvestor) markOnboardingStep(user.id, 'pricesSeen');
  }, [isInvestor, user.id]);

  // Local price drafts, pushed to the URL after typing pauses
  const [minDraft, setMinDraft] = useState(minPrice ?? 0);
  const [maxDraft, setMaxDraft] = useState(maxPrice ?? 0);

  // URL changed from outside (clear filters, back button): adopt it during render
  const urlKey = `${minPrice ?? 0}|${maxPrice ?? 0}`;
  const [syncedUrlKey, setSyncedUrlKey] = useState(urlKey);
  if (urlKey !== syncedUrlKey) {
    setSyncedUrlKey(urlKey);
    setMinDraft(minPrice ?? 0);
    setMaxDraft(maxPrice ?? 0);
  }

  const updateParams = (patch: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === '' || value === 0) next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (minDraft === (minPrice ?? 0) && maxDraft === (maxPrice ?? 0)) return;
    const id = setTimeout(() => updateParams({ min_price: minDraft, max_price: maxDraft }), PRICE_DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDraft, maxDraft]);

  const clearFilters = () => setSearchParams(new URLSearchParams(), { replace: true });

  const karatOptions: SegmentOption<string>[] = [
    { value: 'all', label: m.all },
    ...KARATS.map((k) => ({ value: String(k), label: String(k) })),
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Sticky filter bar under the topbar (04-layout T2) */}
      <div className="sticky top-14 lg:top-topbar z-sticky -mx-5 md:-mx-8 xl:-mx-13 -mt-8 px-5 md:px-8 xl:px-13 py-3 bg-canvas border-b border-line-subtle flex flex-col md:flex-row md:items-end gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg-muted">{m.karat}</span>
          <Segmented
            options={karatOptions}
            value={karat ? String(karat) : 'all'}
            onChange={(v) => updateParams({ karat: v === 'all' ? undefined : v })}
            name="market-karat-filter"
            ariaLabel={m.karat}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:w-g5">
          <MoneyInput label={m.priceFrom} value={minDraft} onChangeValue={setMinDraft} unit={t.units.perGram} />
          <MoneyInput label={m.priceTo} value={maxDraft} onChangeValue={setMaxDraft} unit={t.units.perGram} />
        </div>

        <div className="flex items-center gap-3 md:ms-auto h-control-lg">
          <span className="inline-flex items-center gap-2 text-sm text-fg-subtle whitespace-nowrap">
            <ArrowsDownUpIcon size={16} aria-hidden="true" />
            {m.sortPromoted}
          </span>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-11 px-2 rounded-sm text-body font-medium text-fg-link hover:text-fg-link-hover whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
            >
              {m.clear}
            </button>
          )}
        </div>
      </div>

      {listingsQuery.isPending ? (
        <div className="card-grid-listings" aria-busy="true">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
          ))}
        </div>
      ) : listingsQuery.isError ? (
        <Card404
          icon={<WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />}
          title={m.loadFailed}
        >
          <Button variant="secondary" size="md" onClick={() => listingsQuery.refetch()}>
            {t.common.retry}
          </Button>
        </Card404>
      ) : listings.length === 0 ? (
        <Card404 icon={<SlidersHorizontalIcon size={32} aria-hidden="true" />} title={m.empty}>
          {hasFilters && (
            <Button variant="secondary" size="md" onClick={clearFilters}>
              {m.clear}
            </Button>
          )}
          {isInvestor && (
            <Button variant="primary" size="md" onClick={() => navigate('/app/match')}>
              {m.tryMatch}
            </Button>
          )}
        </Card404>
      ) : (
        <>
          <p className="m-0 text-sm text-fg-subtle">{m.count(total)}</p>
          <div className="card-grid-listings">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} isSellerView={!isInvestor} />
            ))}
          </div>
          {listingsQuery.hasNextPage && (
            <Button
              variant="secondary"
              size="lg"
              className="self-center"
              loading={listingsQuery.isFetchingNextPage}
              onClick={() => listingsQuery.fetchNextPage()}
            >
              {m.loadMore(total - listings.length)}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

// Empty / error block with the same footprint as a listing card (04-layout §8.3)
const Card404: React.FC<{ icon: React.ReactNode; title: string; children?: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <div className="h-g4 flex flex-col items-center justify-center text-center gap-4 rounded-md bg-surface-1 border border-line p-8">
    <span className="size-16 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-muted">
      {icon}
    </span>
    <p className="m-0 text-h4 font-semibold text-fg">{title}</p>
    <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
  </div>
);
