// src/features/transactions/TransactionsTable.tsx
// Transaction history per UI Kit 06-style §5.5 & 08-ux §11: table on desktop, 2-line rows on
// mobile, row → receipt (GET /api/transactions/{id}). Investors see what they paid, sellers
// what they received.

import React, { useState } from 'react';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { Table, Column } from '@/components/ui/Table';
import { Dialog } from '@/components/ui/Dialog';
import { Num } from '@/components/ui/Num';
import { Button } from '@/components/ui/Button';
import { ReceiptDetails } from '@/components/fin/ReceiptDetails';
import { ErrorState } from '@/components/ui/ErrorState';
import { useTransaction } from '@/lib/queries';
import { fmtDate } from '@/lib/formatters';
import { Transaction, UserRole } from '@/lib/types';
import { useT } from '@/i18n';

interface TransactionsTableProps {
  transactions: Transaction[];
  viewer: UserRole;
  loading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  emptyMessage?: string;
}

const ReceiptDialog: React.FC<{ id: string | null; viewer: UserRole; onClose: () => void }> = ({
  id,
  viewer,
  onClose,
}) => {
  const t = useT();
  const txQuery = useTransaction(id);

  return (
    <Dialog isOpen={Boolean(id)} onClose={onClose} size="md" title={t.receipt.title}>
      {txQuery.data ? (
        <ReceiptDetails tx={txQuery.data} viewer={viewer} />
      ) : txQuery.isError ? (
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          <WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
          <p className="m-0 text-body text-fg">{t.receipt.loadFailed}</p>
          <Button variant="secondary" size="md" onClick={() => txQuery.refetch()}>
            {t.common.retry}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 rounded-sm skeleton-loading" aria-hidden="true" />
          ))}
        </div>
      )}
    </Dialog>
  );
};

export const TransactionsTable: React.FC<TransactionsTableProps> = ({
  transactions,
  viewer,
  loading = false,
  isError = false,
  onRetry,
  emptyMessage,
}) => {
  const t = useT();
  const h = t.history;
  const [openId, setOpenId] = useState<string | null>(null);
  const isInvestor = viewer === 'investor';

  const columns: Column<Transaction>[] = [
    {
      key: 'date',
      header: h.colDate,
      render: (tx) => <span className="text-sm text-fg-muted">{fmtDate(tx.created_at)}</span>,
    },
    isInvestor
      ? { key: 'seller', header: h.colSeller, render: (tx) => tx.seller_name }
      : { key: 'buyer', header: h.colBuyer, render: (tx) => tx.buyer_ref ?? t.receipt.buyerAnonymous },
    { key: 'karat', header: h.colKarat, render: (tx) => t.units.karat(tx.karat) },
    {
      key: 'grams',
      header: h.colGrams,
      align: 'end',
      render: (tx) => <Num value={tx.purchased_weight_grams} format="grams" />,
    },
    {
      key: 'price',
      header: h.colPrice,
      align: 'end',
      render: (tx) => <Num value={tx.execution_price_per_gram} format="iqd" />,
    },
    ...(isInvestor
      ? ([
          {
            key: 'commission',
            header: h.colCommission,
            align: 'end',
            render: (tx) => <Num value={tx.commission_amount} format="iqd" />,
          },
          {
            key: 'total',
            header: h.colTotal,
            align: 'end',
            render: (tx) => <Num value={tx.total_paid_by_investor} format="iqd" />,
          },
        ] satisfies Column<Transaction>[])
      : ([
          {
            key: 'received',
            header: h.colReceived,
            align: 'end',
            render: (tx) => <Num value={tx.principal_amount} format="iqd" />,
          },
        ] satisfies Column<Transaction>[])),
  ];

  if (isError) {
    return <ErrorState message={h.loadFailed} onRetry={onRetry} />;
  }

  return (
    <>
      <div className="hidden lg:block rounded-md bg-surface-1 border border-line overflow-hidden">
        <Table
          columns={columns}
          data={transactions}
          keyExtractor={(tx) => tx.id}
          onRowClick={(tx) => setOpenId(tx.id)}
          loading={loading}
          emptyMessage={emptyMessage ?? h.empty}
          caption={h.title}
        />
      </div>

      {/* Mobile: two-line rows, primary line = amount (06-style §5.5) */}
      <ul className="lg:hidden m-0 p-0 list-none rounded-md bg-surface-1 border border-line divide-y divide-line-subtle overflow-hidden">
        {loading && <li className="h-16 skeleton-loading" aria-hidden="true" />}
        {!loading && transactions.length === 0 && (
          <li className="p-5 text-body text-fg-subtle text-center">{emptyMessage ?? h.empty}</li>
        )}
        {transactions.map((tx) => (
          <li key={tx.id}>
            <button
              type="button"
              onClick={() => setOpenId(tx.id)}
              className="w-full min-h-16 px-4 py-2 flex items-center justify-between gap-3 text-start hover:bg-state-hover outline-none focus-visible:bg-state-hover"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-body font-semibold text-fg">
                  <Num value={isInvestor ? tx.total_paid_by_investor : tx.principal_amount} format="iqd" />
                </span>
                <span className="text-sm text-fg-subtle truncate">
                  {fmtDate(tx.created_at)} · {t.units.karat(tx.karat)}
                </span>
              </span>
              <span className="text-body font-medium text-fg-muted shrink-0">
                <Num value={tx.purchased_weight_grams} format="grams" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="m-0 text-sm text-fg-subtle">{h.permanent}</p>

      <ReceiptDialog id={openId} viewer={viewer} onClose={() => setOpenId(null)} />
    </>
  );
};
