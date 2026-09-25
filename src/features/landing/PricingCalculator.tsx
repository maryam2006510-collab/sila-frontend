// src/features/landing/PricingCalculator.tsx
// Transparent pricing per UI Kit 08-ux §12 #5: karat + grams → price per gram, principal,
// commission tier and total with the server's formula; flat-faceted gold bars stack with
// the grams (Anime.js, 07-motion §4.6) and the public tier table.

import React, { useEffect, useRef, useState } from 'react';
import { animate, stagger, createScope, Scope } from 'animejs';
import { Segmented } from '@/components/ui/Segmented';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Num } from '@/components/ui/Num';
import { TierTable } from '@/components/fin/TierTable';
import { useMarketPrices, useServerConfig } from '@/lib/queries';
import { KARATS, livePriceFor, estimateOrder } from '@/lib/pricing';
import { fmtGrams, fmtRate } from '@/lib/formatters';
import { Karat } from '@/lib/types';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

const GRAMS_PER_BAR = 10;
const MAX_BARS = 12;

// Bars stack in rows of 3, each row offset half a step like a real pile
const BARS_PER_ROW = 3;
const BAR_W = 96;
const BAR_H = 37;
const COL_STEP = 104;
const ROW_STEP = 26;
const ROW_SHIFT = 16;

// Isometric bar from three flat faces (06-style §8): top, front, side. No gradient, no shine.
const GoldBar: React.FC<{ index: number }> = ({ index }) => {
  const row = Math.floor(index / BARS_PER_ROW);
  const col = index % BARS_PER_ROW;
  return (
    <svg
      data-bar
      viewBox="0 0 120 46"
      className="absolute"
      style={{
        width: BAR_W,
        height: BAR_H,
        bottom: row * ROW_STEP,
        insetInlineStart: col * COL_STEP + (row % 2) * ROW_SHIFT,
      }}
      aria-hidden="true"
    >
      <polygon points="4,18 16,6 116,6 104,18" className="fill-gold-top" />
      <polygon points="4,18 104,18 104,42 4,42" className="fill-gold-front" />
      <polygon points="104,18 116,6 116,30 104,42" className="fill-gold-side" />
    </svg>
  );
};

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const PricingCalculator: React.FC = () => {
  const t = useT();
  const p = t.landing.pricing;
  const prices = useMarketPrices().data;
  const [karat, setKarat] = useState<Karat>(21);
  const [grams, setGrams] = useState(25);

  const bars = Math.min(MAX_BARS, Math.max(1, Math.ceil(grams / GRAMS_PER_BAR)));
  const stackRef = useRef<HTMLDivElement>(null);
  const scope = useRef<Scope | null>(null);
  const shown = useRef(0);

  useEffect(() => {
    scope.current = createScope({ root: stackRef });
    return () => scope.current?.revert();
  }, []);

  // New bars drop in (y 20 → 0, stagger 34ms); removed ones simply leave
  useEffect(() => {
    const added = bars - shown.current;
    shown.current = bars;
    if (added <= 0 || !stackRef.current || prefersReducedMotion()) return;
    const fresh = Array.from(stackRef.current.querySelectorAll('[data-bar]')).slice(-added);
    scope.current?.add(() => {
      animate(fresh, { translateY: [20, 0], opacity: [0, 1], duration: 550, delay: stagger(34), ease: 'outExpo' });
    });
  }, [bars]);

  const pricePerGram = prices ? livePriceFor(prices, karat) : 0;
  // Same tiers as the server (GET /api/config); zeros until they arrive
  const tiers = useServerConfig().data?.commission_tiers ?? [];
  const est = estimateOrder(grams > 0 ? grams : 0, pricePerGram, tiers);

  return (
    <section
      id="pricing"
      aria-label={p.title}
      className="landing-anchor container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34"
    >
      <div className="flex flex-col gap-3 mb-13">
        <h2 data-reveal className="m-0 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
          {noOrphan(p.title)}
        </h2>
        <p data-reveal-block className="m-0 max-w-128 text-h4 font-normal text-fg-muted">
          {noOrphan(p.body)}
        </p>
      </div>

      {/* Both columns share one top and one bottom edge: the bars box absorbs the difference */}
      {/* Calculator first (inline-start, 1.618fr), the visual + tiers after it (1fr) */}
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-13 items-stretch">
        {/* 1fr: the visual + public tiers */}
        <div data-reveal-item className="flex flex-col gap-8 order-2">
          <div
            ref={stackRef}
            role="img"
            aria-label={p.barsLabel(fmtGrams(grams))}
            className="relative h-g4 lg:h-auto lg:flex-1 rounded-md bg-subtle border border-line-subtle overflow-hidden"
          >
            <div className="absolute bottom-8 start-5 md:start-8">
              {Array.from({ length: bars }, (_, i) => (
                <GoldBar key={i} index={i} />
              ))}
            </div>
          </div>
          <TierTable currentWeight={grams} />
        </div>

        {/* 1.618fr: the calculator */}
        <div data-reveal-item className="flex flex-col order-1">
          <div className="flex-1 flex flex-col gap-5 rounded-md bg-surface-1 border border-line p-5 md:p-8">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-fg-muted">{p.karat}</span>
              <Segmented
                options={KARATS.map((k) => ({ value: k, label: String(k) }))}
                value={karat}
                onChange={setKarat}
                name="landing-karat"
                ariaLabel={p.karat}
              />
            </div>

            <MoneyInput
              label={p.grams}
              unit={t.units.grams}
              value={grams}
              onChangeValue={setGrams}
              suggestions={[10, 50, 250]}
            />

            <dl className="m-0" aria-live="polite">
              {[
                [p.pricePerGram, <Num key="p" value={Math.round(pricePerGram)} format="iqd" />],
                [p.principal, <Num key="v" value={est.principal} format="iqd" />],
                [
                  <>
                    {p.commission} (<bdi className="num">{fmtRate(est.rate)}</bdi>)
                  </>,
                  <Num key="c" value={est.commission} format="iqd" />,
                ],
              ].map(([label, value], i) => (
                <div key={i} className="flex items-center justify-between gap-3 h-11 border-b border-line-subtle">
                  <dt className="text-body text-fg-muted">{label}</dt>
                  <dd className="m-0 text-body font-medium text-fg">{value}</dd>
                </div>
              ))}
              <div className="flex flex-wrap items-baseline justify-between gap-3 pt-3">
                <dt className="text-body font-semibold text-fg">{p.total}</dt>
                <dd className="m-0 text-h2 font-semibold text-fg">
                  <Num value={est.total} format="iqd" standalone />
                </dd>
              </div>
            </dl>

            <p className="m-0 text-sm text-fg-subtle">{p.sellerNote}</p>
          </div>
        </div>
      </div>
    </section>
  );
};
