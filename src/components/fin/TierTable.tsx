// src/components/fin/TierTable.tsx
// Public commission tiers, straight from GET /api/config (never hard-coded).

import React from 'react';
import { Num } from '@/components/ui/Num';
import { tierFor } from '@/lib/pricing';
import { tierLabel } from '@/lib/tiers';
import { useServerConfig } from '@/lib/queries';
import { useT } from '@/i18n';

interface TierTableProps {
  currentWeight?: number;
  className?: string;
}

export const TierTable: React.FC<TierTableProps> = ({ currentWeight, className = '' }) => {
  const t = useT();
  const tiers = useServerConfig().data?.commission_tiers;
  const active = tiers && currentWeight !== undefined && currentWeight > 0 ? tierFor(currentWeight, tiers) : undefined;

  return (
    <section className={`rounded-md bg-surface-1 border border-line overflow-hidden text-start ${className}`}>
      <header className="p-4 border-b border-line-subtle bg-muted">
        <h4 className="text-h4 font-semibold text-fg m-0">{t.tiers.title}</h4>
        <p className="text-sm text-fg-subtle m-0">{t.tiers.subtitle}</p>
      </header>

      <ul className="m-0 p-0 list-none divide-y divide-line-subtle" aria-busy={!tiers || undefined}>
        {tiers
          ? tiers.map((tier) => {
              const isActive = tier === active;
              return (
                <li
                  key={tier.label}
                  aria-current={isActive || undefined}
                  className={`flex items-center justify-between gap-3 h-11 px-4 text-body ${
                    isActive ? 'bg-state-selected text-fg font-semibold' : 'text-fg-muted'
                  }`}
                >
                  {/* label_ar comes from the server; a backend without it falls back to the bounds */}
                  <span>{tier.label_ar || tierLabel(tier, t)}</span>
                  <span className="flex items-center gap-2">
                    {isActive && (
                      <span className="h-6 px-2 inline-flex items-center rounded-xs text-sm font-medium border border-line-strong text-fg">
                        {t.tiers.yourTier}
                      </span>
                    )}
                    <span className="font-semibold text-fg">
                      <Num value={tier.rate} format="rate" />
                    </span>
                  </span>
                </li>
              );
            })
          : [0, 1, 2].map((i) => (
              <li key={i} className="h-11 px-4 flex items-center">
                <span className="h-4 w-1/2 rounded-xs skeleton-loading" aria-hidden="true" />
              </li>
            ))}
      </ul>
    </section>
  );
};
