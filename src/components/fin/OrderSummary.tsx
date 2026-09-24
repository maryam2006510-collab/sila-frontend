// src/components/fin/OrderSummary.tsx
// Checkout order summary per UI Kit 06-style §6.4 & 08-ux §8 Step 5.2
// Rows 44, label start / number end. Fees before confirm; confirm repeats the total.
// The quote is valid until quote_expires_at (contract §5): a live countdown, then the confirm
// button is replaced with "refresh preview".

import React from 'react';
import { LockSimpleIcon, ArrowsClockwiseIcon, WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { fmtIQD, fmtRate, fmtRelativeFuture } from '@/lib/formatters';
import { useNow } from '@/lib/hooks';
import { TransactionPreview } from '@/lib/types';
import { useT } from '@/i18n';

interface OrderSummaryProps {
  preview: TransactionPreview;
  onConfirm: () => void;
  onRefresh?: () => void;
  isStale?: boolean;
  loading?: boolean;
  refreshing?: boolean;
  // Mobile checkout moves the primary action into a sticky bottom bar (04-layout T3)
  actionsClassName?: string;
  className?: string;
}

const Row: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 h-11">
    <dt className="text-body text-fg-muted">{label}</dt>
    <dd className="m-0 text-body font-medium text-fg">{children}</dd>
  </div>
);

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  preview,
  onConfirm,
  onRefresh,
  isStale = false,
  loading = false,
  refreshing = false,
  actionsClassName = '',
  className = '',
}) => {
  const t = useT();
  // Ticks every second for the quote countdown
  const now = useNow(1000);
  const secondsLeft = Math.max(0, Math.ceil((new Date(preview.quote_expires_at).getTime() - now) / 1000));

  return (
    <section
      aria-labelledby="order-summary-title"
      className={`rounded-md bg-surface-1 border border-line p-5 flex flex-col gap-2 text-start ${className}`}
    >
      <h3 id="order-summary-title" className="text-h4 font-semibold text-fg m-0 pb-3 border-b border-line-subtle">
        {t.order.title}
      </h3>

      <dl className="m-0">
        <Row label={t.order.quantity}>
          <Num value={preview.purchased_weight_grams} format="grams" />
        </Row>
        <Row label={t.order.executionPrice(preview.karat)}>
          <Num value={preview.execution_price_per_gram} format="iqd" />
        </Row>
        <Row label={t.order.principal}>
          <Num value={preview.principal_amount} format="iqd" />
        </Row>
        {/* Figures inside Arabic text are isolated, or "%" flips side (bidi AN rule) */}
        <Row
          label={
            <>
              {t.order.commission} (<bdi className="num">{fmtRate(preview.commission_rate)}</bdi>)
            </>
          }
        >
          <Num value={preview.commission_amount} format="iqd" />
        </Row>

        {/* Focal figure: the total (h2, primary) */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 pt-3 mt-1 border-t border-line-strong">
          <dt className="text-body font-semibold text-fg whitespace-nowrap">{t.order.total}</dt>
          <dd className="m-0 text-h2 font-semibold text-fg">
            <Num value={preview.total_paid_by_investor} format="iqd" standalone />
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-2 min-h-11 text-sm text-fg-subtle">
        <span className="flex items-center gap-2 min-w-0">
          <LockSimpleIcon size={16} className="shrink-0" aria-hidden="true" />
          <span className="truncate">
            {isStale ? t.order.quoteExpired : t.order.quoteValid(fmtRelativeFuture(secondsLeft))}
          </span>
        </span>
        {onRefresh && !isStale && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1 h-11 px-2 -me-2 rounded-sm font-medium text-fg-link hover:text-fg-link-hover shrink-0 outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
          >
            <ArrowsClockwiseIcon size={16} aria-hidden="true" />
            <span>{t.order.refresh}</span>
          </button>
        )}
      </div>

      {isStale && (
        <p className="m-0 p-3 rounded-sm bg-warning-bg border border-warning-line text-sm font-medium text-warning-fg flex items-center gap-2">
          <WarningIcon size={16} weight="fill" className="shrink-0" aria-hidden="true" />
          {t.order.staleNotice}
        </p>
      )}

      <div className={actionsClassName}>
        {isStale ? (
          <Button variant="primary" size="xl" fullWidth loading={refreshing} onClick={onRefresh}>
            {t.order.refreshPreview}
          </Button>
        ) : (
          <Button variant="accent" size="xl" fullWidth loading={loading} onClick={onConfirm}>
            {t.order.confirm} · <bdi className="num">{fmtIQD(preview.total_paid_by_investor)}</bdi> {t.units.iqd}
          </Button>
        )}
      </div>

      <p className="m-0 pt-1 text-sm text-fg-subtle flex items-start gap-2">
        <LockSimpleIcon size={16} className="shrink-0 mt-1" aria-hidden="true" />
        {t.order.secureNote}
      </p>
    </section>
  );
};
