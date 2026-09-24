// src/components/fin/ReceiptDetails.tsx
// Transaction receipt rows (08-ux §8 Step 5.4, §11 Screen 8.1 "row → receipt sheet").
// Investor view: what was paid. Seller view: what was received (principal, no commission).

import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from '@phosphor-icons/react';
import { Num } from '@/components/ui/Num';
import { fmtDateTime, fmtRate } from '@/lib/formatters';
import { Transaction, UserRole } from '@/lib/types';
import { useT } from '@/i18n';

const COPY_FEEDBACK_MS = 1600;

interface ReceiptDetailsProps {
  tx: Transaction;
  viewer: UserRole;
}

// 69ec765d…50c7
const shortId = (id: string) => (id.length > 14 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id);

export const ReceiptDetails: React.FC<ReceiptDetailsProps> = ({ tx, viewer }) => {
  const t = useT();
  const r = t.receipt;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tx.id);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    } catch {
      // Clipboard blocked: the reference stays visible for manual copy
    }
  };

  const rows: [React.ReactNode, React.ReactNode][] =
    viewer === 'investor'
      ? [
          [r.grams, <Num value={tx.purchased_weight_grams} format="grams" />],
          [r.karat, t.units.karat(tx.karat)],
          [t.order.executionPrice(tx.karat), <Num value={tx.execution_price_per_gram} format="iqd" />],
          [t.order.principal, <Num value={tx.principal_amount} format="iqd" />],
          [
            <>
              {t.order.commission} (<bdi className="num">{fmtRate(tx.commission_rate)}</bdi>)
            </>,
            <Num value={tx.commission_amount} format="iqd" />,
          ],
          [r.totalPaid, <Num value={tx.total_paid_by_investor} format="iqd" />],
          [r.seller, tx.seller_name],
        ]
      : [
          [r.grams, <Num value={tx.purchased_weight_grams} format="grams" />],
          [r.karat, t.units.karat(tx.karat)],
          [t.order.executionPrice(tx.karat), <Num value={tx.execution_price_per_gram} format="iqd" />],
          [r.received, <Num value={tx.principal_amount} format="iqd" />],
          // Sellers get a pseudonym (buyer_ref), never the buyer's identity
          [r.buyer, tx.buyer_ref ?? r.buyerAnonymous],
        ];

  return (
    <dl className="m-0">
      {rows.map(([label, value], i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 min-h-11 py-1 border-b border-line-subtle last:border-b-0"
        >
          <dt className="text-body text-fg-muted">{label}</dt>
          <dd className="m-0 text-body font-medium text-fg text-end">{value}</dd>
        </div>
      ))}
      <div className="flex items-center justify-between gap-4 min-h-11 py-1 border-b border-line-subtle">
        <dt className="text-body text-fg-muted">{r.dateTime}</dt>
        <dd className="m-0 text-body font-medium text-fg">
          <bdi>{fmtDateTime(tx.created_at)}</bdi>
        </dd>
      </div>
      <div className="flex items-center justify-between gap-4 min-h-11">
        <dt className="text-body text-fg-muted">{r.reference}</dt>
        <dd className="m-0 flex items-center gap-1">
          {/* The transaction id is the reference; shortened on screen, copied in full */}
          <code className="num text-sm text-fg" dir="ltr" title={tx.id}>
            {shortId(tx.id)}
          </code>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? t.common.copied : t.common.copy}
            className="size-11 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
          >
            {copied ? <CheckIcon size={16} className="text-success-fg" /> : <CopyIcon size={16} />}
          </button>
        </dd>
      </div>
    </dl>
  );
};
