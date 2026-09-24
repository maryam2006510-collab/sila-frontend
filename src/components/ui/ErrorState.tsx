// src/components/ui/ErrorState.tsx
// One failure block for every data region (08-ux §3.3): what failed, plus a way forward.
// A failed request is always shown as a failure, never as zero or as an empty list.

import React from 'react';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { Card, CardHeight } from './Card';
import { Button } from './Button';
import { useT } from '@/i18n';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  // Replaces the retry button (e.g. "back to market" when retrying cannot help)
  action?: React.ReactNode;
  // Match the ladder height of the content it stands in for, so nothing jumps
  height?: CardHeight;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  onRetry,
  action,
  height = 'small',
  className = '',
}) => {
  const t = useT();
  return (
    <Card
      height={height}
      padding="normal"
      role="alert"
      className={`items-center justify-center text-center gap-4 ${className}`}
    >
      <WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
      <p className="m-0 text-body text-fg">{message}</p>
      {action ??
        (onRetry && (
          <Button variant="secondary" size="md" onClick={onRetry}>
            {t.common.retry}
          </Button>
        ))}
    </Card>
  );
};
