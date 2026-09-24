// src/components/fin/OrderEstimate.tsx
// Client-side estimate labelled "تقديري" with the commission tiers of GET /api/config
// (08-ux §6 Screen 3.3 aside, §8 Step 5.1). The server preview is the real number.

import React from 'react';
import { InfoIcon } from '@phosphor-icons/react';
import { Num } from '@/components/ui/Num';
import { estimateOrder, nextTier, TIER_NUDGE_WINDOW_G } from '@/lib/pricing';
import { fmtNumber, fmtRate } from '@/lib/formatters';
import { tierStart } from '@/lib/tiers';
import { useServerConfig } from '@/lib/queries';
import { useT } from '@/i18n';

interface OrderEstimateProps {
  grams: number;
  pricePerGram: number;
  className?: string;
}

export const OrderEstimate: React.FC<OrderEstimateProps> = ({ grams, pricePerGram, className = '' }) => {
  const t = useT();
  const e = t.estimate;
  const tiers = useServerConfig().data?.commission_tiers;
  const valid = grams > 0;

  // Rates are the server's: until they arrive, no estimate (never a 0% commission)
  if (!tiers) return <div className={`h-g3 rounded-sm skeleton-loading ${className}`} aria-hidden="true" />;

  const est = estimateOrder(valid ? grams : 0, pricePerGram, tiers);
  const tier = valid ? nextTier(grams, tiers) : null;
  const start = tier ? tierStart(tier.threshold) : null;
  const showNudge = tier && tier.threshold - grams <= TIER_NUDGE_WINDOW_G;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <dl className="m-0 rounded-sm bg-sunken border border-line-subtle px-4 py-2">
        <div className="flex items-center justify-between gap-3 h-11">
          <dt className="text-body text-fg-muted">{t.order.principal}</dt>
          <dd className="m-0 text-body font-medium text-fg">
            <Num value={est.principal} format="iqd" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 h-11">
          <dt className="text-body text-fg-muted">
            {t.order.commission} (<bdi className="num">{fmtRate(est.rate)}</bdi>)
          </dt>
          <dd className="m-0 text-body font-medium text-fg">
            <Num value={est.commission} format="iqd" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 h-11 border-t border-line-subtle">
          <dt className="text-body font-semibold text-fg">
            {t.order.total} <span className="text-sm font-normal text-fg-subtle">({e.estimated})</span>
          </dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={est.total} format="iqd" />
          </dd>
        </div>
      </dl>

      {/* Transparent tier nudge: info style, never gold, never pushy */}
      {showNudge && tier && (
        <p className="m-0 p-3 rounded-sm bg-info-bg border border-info-line text-sm font-medium text-info-fg flex items-start gap-2">
          <InfoIcon size={16} weight="fill" className="shrink-0 mt-1" aria-hidden="true" />
          <span>
            {start!.at ? e.nudgeAt : e.nudgeAbove} <bdi className="num">{fmtNumber(start!.grams)}</bdi> {t.units.grams}{' '}
            {e.nudgeRate} <bdi className="num">{fmtRate(tier.rate)}</bdi>.
          </span>
        </p>
      )}

      <p className="m-0 text-sm text-fg-subtle">{e.disclaimer}</p>
    </div>
  );
};
