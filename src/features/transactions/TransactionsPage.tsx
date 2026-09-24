// src/features/transactions/TransactionsPage.tsx
// سجل العمليات (both roles) per UI Kit 08-ux §2.1 & workflow 08

import React from 'react';
import { useAppContext } from '@/features/shell/appContext';
import { useTransactions } from '@/lib/queries';
import { TransactionsTable } from './TransactionsTable';

// The page title lives in the topbar (08-ux §2.2); no second heading here
export const TransactionsPage: React.FC = () => {
  const { user } = useAppContext();
  const query = useTransactions();

  return (
    <TransactionsTable
      transactions={query.data ?? []}
      viewer={user.role}
      loading={query.isPending}
      isError={query.isError}
      onRetry={() => query.refetch()}
    />
  );
};
