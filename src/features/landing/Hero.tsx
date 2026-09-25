// src/features/landing/Hero.tsx
// Hero per UI Kit 08-ux §12 #2 & 07-motion §4.3: golden split, headline ≤ 2 lines,
// sub ≤ 20 words, the REAL live price card, navy wash (one of its two allowed places).
// Copy positions Sila as a real-assets platform that starts with gold: an eyebrow, the asset
// roadmap (gold now, real estate and oil soon) and a trust line under the CTA.

import React from 'react';
import { BuildingsIcon, CoinsIcon, DropIcon, Icon } from '@phosphor-icons/react';
import { ButtonLink } from '@/components/ui/Button';
import { LivePricePanel } from '@/components/fin/LivePricePanel';
import { useMarketPrices } from '@/lib/queries';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

// Assets that are coming: plain text, not controls (no hover, no pointer), visibly muted
const SoonChip: React.FC<{ icon: Icon; name: string; soon: string }> = ({ icon: AssetIcon, name, soon }) => (
  <li className="inline-flex items-center gap-2 h-control-sm px-3 rounded-sm border border-line-subtle text-sm text-fg-disabled cursor-default select-none">
    <AssetIcon size={16} aria-hidden="true" />
    <span className="font-medium">{name}</span>
    <span className="text-xs">{soon}</span>
  </li>
);

export const Hero: React.FC = () => {
  const t = useT();
  const h = t.landing.hero;
  const prices = useMarketPrices().data;

  // Entrance on load: words (55ms apart) → sub → CTAs → price card (07-motion §4.3), whole words only,
  // never characters. Pure CSS (base.css .hero-in-*): it is a fixed sequence, so it starts with the
  // first paint and costs no main thread. As GSAP tweens it read each word's transform right after
  // writing the previous one, forcing a full page layout per word: ~1.2s on a mid-range phone (D35).
  return (
    <section className="relative bg-wash pt-18">
      <div className="container-landing px-5 md:px-8 xl:px-13 min-h-svh py-21 grid grid-cols-1 lg:grid-cols-golden gap-13 items-center">
        <div className="flex flex-col gap-8 min-w-0">
          {/* The page's one eyebrow (06-style §9: max one per three sections) */}
          <p className="m-0 -mb-5 text-sm font-semibold text-fg-muted">{h.eyebrow}</p>
          <h1 data-hero-title className="m-0 text-h1 sm:text-display-lg xl:text-display-xl font-bold text-fg py-0.5">
            {/* Each word rises inside its own mask (one line box tall). Spaces stay real text, so
                lines wrap exactly as plain text; the no-orphan space keeps the last two words together */}
            {noOrphan(h.title)
              .split(' ')
              .map((word, i) => (
                <React.Fragment key={i}>
                  {i > 0 && ' '}
                  <span className="inline-block overflow-hidden align-top">
                    <span className="hero-in-word inline-block" style={{ '--i': i } as React.CSSProperties}>
                      {word}
                    </span>
                  </span>
                </React.Fragment>
              ))}
          </h1>
          <p className="hero-in-sub m-0 max-w-128 text-h4 font-normal text-fg-muted">{noOrphan(h.sub)}</p>
          {/* Asset roadmap: gold is live, the rest is announced, never clickable */}
          <ul aria-label={h.assetsLabel} className="hero-in-sub m-0 p-0 list-none flex flex-wrap gap-2">
            <li className="inline-flex items-center gap-2 h-control-sm px-3 rounded-sm border border-line-strong bg-surface-1 text-sm text-fg">
              <CoinsIcon size={16} aria-hidden="true" />
              <span className="font-semibold">{h.assets.gold}</span>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted">
                <span className="live-indicator-square" aria-hidden="true" />
                {h.availableNow}
              </span>
            </li>
            <SoonChip icon={BuildingsIcon} name={h.assets.realEstate} soon={h.comingSoon} />
            <SoonChip icon={DropIcon} name={h.assets.oil} soon={h.comingSoon} />
          </ul>

          <div data-hero-cta data-gold-cta className="hero-in-cta flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink to="/signup" variant="accent" size="xl">
                {h.cta}
              </ButtonLink>
              <a
                href="#how"
                className="inline-flex items-center h-control-xl px-6 rounded-sm text-h4 font-semibold text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
              >
                {h.how}
              </a>
            </div>
            <p className="m-0 text-sm text-fg-subtle">{h.trust}</p>
          </div>
        </div>

        <div className="hero-in-card min-w-0">
          {prices ? (
            <LivePricePanel prices={prices} className="shadow-showcase" />
          ) : (
            <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
          )}
        </div>
      </div>
    </section>
  );
};
