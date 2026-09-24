// src/components/fin/LivePricePanel.tsx
// Dashboard focal point per UI Kit 06-visual-style-fintech.md §6.1 (height 356, 04-layout T1)

import React, { useState } from 'react';
import { CaretUpIcon, CaretDownIcon, WarningIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Segmented, SegmentOption } from '@/components/ui/Segmented';
import { RollingNumber } from '@/components/ui/RollingNumber';
import { Num } from '@/components/ui/Num';
import { PriceChart } from './PriceChart';
import { CHART_RANGES, ChartRange } from '@/lib/priceHistory';
import { usePriceHistory } from '@/lib/queries';
import { fmtPct, fmtRelativeTime, fmtTime, fmtIQD } from '@/lib/formatters';
import { useNow, useTickFlash } from '@/lib/hooks';
import { KARATS, livePriceFor } from '@/lib/pricing';
import { MarketPrices } from '@/lib/types';
import { useT } from '@/i18n';

interface LivePricePanelProps {
  prices: MarketPrices;
  className?: string;
}

export const LivePricePanel: React.FC<LivePricePanelProps> = ({ prices, className = '' }) => {
  const t = useT();
  const [range, setRange] = useState<ChartRange>('1D');
  // Re-renders the "قبل 20 ثانية" label every few seconds
  useNow();
  // Contract: is_stale = the provider is down and these are the last cached figures
  const stale = prices.is_stale;
  const flash = useTickFlash(prices.price_24k);

  // Real 24K history for the selected range (GET /api/market/prices/history)
  const history = usePriceHistory(24, range);
  const chartData = history.data?.points ?? [];
  const change = prices.change_24h_pct;
  const rangeOptions: SegmentOption<ChartRange>[] = CHART_RANGES.map((r) => ({ value: r.value, label: r.value }));

  const isUp = (change ?? 0) >= 0;
  const Caret = isUp ? CaretUpIcon : CaretDownIcon;

  return (
    <Card height="listing" padding="normal" className={`gap-3 ${className}`}>
      {/* Header: live state + freshness, range tabs */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        {/* Freshness sits under the title, never beside it: beside it, it ran under the range tabs */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="live-indicator-square shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-fg whitespace-nowrap">
              {t.market.live} · {t.market.goldPrice}
            </span>
          </div>
          {stale ? (
            <span className="inline-flex items-center gap-1 ps-4 text-sm font-medium text-warning-fg whitespace-nowrap">
              <WarningIcon size={16} weight="fill" aria-hidden="true" />
              {t.market.staleLabel} · <bdi className="num">{fmtTime(prices.last_updated)}</bdi>
            </span>
          ) : (
            <span className="ps-4 text-sm text-fg-subtle truncate">{fmtRelativeTime(prices.last_updated)}</span>
          )}
        </div>

        <div className="hidden sm:block shrink-0">
          <Segmented
            options={rangeOptions}
            value={range}
            onChange={setRange}
            name="live-price-range"
            ariaLabel={t.market.goldPrice}
          />
        </div>
      </div>

      {/* Focal figure: 24K per gram (display-lg, gold) + delta chip */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 shrink-0">
        <div className="flex items-baseline gap-3">
          <span className="text-h2 sm:text-h1 xl:text-display-lg font-bold text-fg-gold whitespace-nowrap">
            <RollingNumber value={prices.price_24k} format={fmtIQD} suffix={t.units.perGram} announce />
          </span>
          {/* The server sends null until it has 24h of history: no chip rather than a fake 0% */}
          {change !== null && (
            <span
              className={`inline-flex items-center gap-1 h-6 px-2 rounded-xs text-xs font-semibold ${
                isUp ? 'text-up' : 'text-down'
              } ${flash ? `tick-flash-${flash}` : ''}`}
            >
              <Caret size={16} weight="fill" aria-hidden="true" />
              <bdi className="num">{fmtPct(change)}</bdi>
            </span>
          )}
        </div>

        <span className="text-sm text-fg-subtle">
          {t.market.usdRate} <Num value={prices.usd_iqd_rate} format="iqd" className="text-fg-muted" />
        </span>
      </div>

      {/* The chart takes whatever height the fixed 356 card leaves (never overflows) */}
      <div className="flex-1 min-h-0">
        <PriceChart
          compact
          data={chartData}
          ariaLabel={`${t.market.chartLabel(24)}: ${fmtIQD(prices.price_24k)} ${t.units.iqd}${change !== null ? `، ${fmtPct(change)}` : ''}`}
        />
      </div>

      {/* Karat row: GlobalPrice24k × Karat/24 */}
      <dl className="grid grid-cols-4 gap-2 pt-3 border-t border-line-subtle shrink-0 m-0">
        {KARATS.map((k) => (
          <div key={k} className="flex flex-col min-w-0">
            <dt className="text-xs font-medium text-fg-subtle">{k}K</dt>
            <dd className="m-0 text-sm font-semibold text-fg">
              <Num value={Math.round(livePriceFor(prices, k))} format="plain" />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};
