// src/features/landing/MarketStrip.tsx
// Live price marquee per UI Kit 08-ux §12 #3 & 07-motion §4.6: the only marquee on the page,
// CSS transform only, pauses on hover/focus and while off-screen.

import React, { useEffect, useRef, useState } from 'react';
import { BroadcastIcon } from '@phosphor-icons/react';
import { Num } from '@/components/ui/Num';
import { useMarketPrices } from '@/lib/queries';
import { KARATS, livePriceFor } from '@/lib/pricing';
import { fmtTime } from '@/lib/formatters';
import { useT } from '@/i18n';

export const MarketStrip: React.FC = () => {
  const t = useT();
  const s = t.landing.strip;
  const prices = useMarketPrices().data;
  const ref = useRef<HTMLDivElement>(null);
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!prices) return <div className="h-16 border-y border-line-subtle bg-subtle" aria-hidden="true" />;

  const items = (
    <>
      {KARATS.map((k) => (
        <span key={k} className="inline-flex items-baseline gap-2 px-8">
          <span className="text-xs font-medium text-fg-subtle">{k}K</span>
          <Num value={livePriceFor(prices, k)} format="iqd" className="text-body text-fg" />
        </span>
      ))}
      <span className="inline-flex items-baseline gap-2 px-8">
        <span className="text-sm text-fg-subtle">{s.usd}</span>
        <Num value={prices.usd_iqd_rate} format="iqd" className="text-body text-fg" />
      </span>
      <span className="inline-flex items-center gap-2 px-8 text-sm text-fg-subtle">
        <BroadcastIcon size={16} aria-hidden="true" />
        {s.updated} <bdi className="num">{fmtTime(prices.last_updated)}</bdi>
      </span>
    </>
  );

  return (
    <section
      ref={ref}
      aria-label={s.label}
      tabIndex={0}
      data-paused={offscreen}
      className="marquee h-16 border-y border-line-subtle bg-subtle overflow-hidden flex items-center outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
    >
      <div className="marquee-track flex w-max whitespace-nowrap">
        <div className="flex shrink-0">{items}</div>
        {/* Visual duplicate for the seamless loop; hidden from assistive tech */}
        <div className="flex shrink-0" aria-hidden="true">
          {items}
        </div>
      </div>
    </section>
  );
};
