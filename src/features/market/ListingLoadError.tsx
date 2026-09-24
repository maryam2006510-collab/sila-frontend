// src/features/market/ListingLoadError.tsx
// A listing that failed to load: only a 404 means "not found"; any other failure can be retried.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/ui/ErrorState';
import { Button } from '@/components/ui/Button';
import { isApiError } from '@/lib/api';
import { useT } from '@/i18n';

interface ListingLoadErrorProps {
  error: unknown;
  onRetry: () => void;
  backTo?: string;
  backLabel?: string;
}

export const ListingLoadError: React.FC<ListingLoadErrorProps> = ({ error, onRetry, backTo, backLabel }) => {
  const t = useT();
  const navigate = useNavigate();

  if (isApiError(error) && error.status === 404) {
    return (
      <ErrorState
        message={t.detail.notFound}
        action={
          <Button variant="secondary" size="md" onClick={() => navigate(backTo ?? '/app/market')}>
            {backLabel ?? t.detail.backToMarket}
          </Button>
        }
      />
    );
  }
  return <ErrorState message={t.detail.loadFailed} onRetry={onRetry} />;
};
