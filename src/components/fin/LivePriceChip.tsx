// src/components/fin/LivePriceChip.tsx
// Topbar live price chip per UI Kit 06-visual-style-fintech.md §6.2 (height 32, Sila Cut)

import React from 'react';
import { Link } from 'react-router-dom';
import { CaretUpIcon, CaretDownIcon } from '@phosphor-icons/react';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { fmtIQD, fmtPct } from '@/lib/formatters';
import { MarketPrices } from '@/lib/types';
import { useT } from '@/i18n';

interface LivePriceChipProps {
  prices: MarketPrices;
  className?: string;
}

export const LivePriceChip: React.FC<LivePriceChipProps> = ({ prices, className = '' }) => {
  const t = useT();
  const change = prices.change_24h_pct;
  const isUp = (change ?? 0) >= 0;
  const Caret = isUp ? CaretUpIcon : CaretDownIcon;

  return (
    <Link
      to="/app/market"
      aria-label={`${t.market.openMarket}: ${t.market.goldPrice} 24K ${fmtIQD(prices.price_24k)} ${t.units.iqd}`}
      className={`inline-flex items-center gap-2 h-control-sm ps-3 pe-4 bg-muted hover:bg-state-hover sila-cut select-none outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard ${className}`}
    >
      <span className="live-indicator-square shrink-0" aria-hidden="true" />
      {/* Phones keep the live square and the figure; "24K" stays in the aria-label */}
      <span className="max-sm:hidden text-xs font-medium text-fg-muted" aria-hidden="true">
        24K
      </span>
      <span className="text-sm font-semibold text-fg-gold" aria-hidden="true">
        <RollingNumber value={prices.price_24k} format={fmtIQD} suffix={t.units.iqd} />
      </span>
      {/* No 24h change yet (null): no delta rather than a fake 0% */}
      {change !== null && (
        <span
          className={`hidden sm:inline-flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-up' : 'text-down'}`}
          aria-hidden="true"
        >
          <Caret size={16} weight="fill" />
          <bdi className="num">{fmtPct(change)}</bdi>
        </span>
      )}
    </Link>
  );
};
