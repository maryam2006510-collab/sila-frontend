// src/components/ui/PageLoader.tsx
// Full-screen load (account restore, first route chunk): the brand icon over the loading squares,
// on the page canvas, so the wait reads as Sila starting rather than a blank page.

import React from 'react';
import { Logo } from './Logo';
import { LoadingSquares } from './LoadingSquares';
import { useT } from '@/i18n';

export const PageLoader: React.FC = () => {
  const t = useT();
  return (
    <div
      className="min-h-screen bg-canvas text-fg-subtle flex flex-col items-center justify-center gap-5"
      role="status"
      aria-busy="true"
    >
      <span className="text-fg">
        <Logo variant="icon" tone="auto" height={40} />
      </span>
      <LoadingSquares size="md" />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
};
