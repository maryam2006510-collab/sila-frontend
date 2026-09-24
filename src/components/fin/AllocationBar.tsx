// src/components/fin/AllocationBar.tsx
// Allocation by karat per UI Kit 01-color §7 (categorical order) & 08-ux §11 Screen 8.1
// Direct labels next to each segment; square swatches (06-style §3.2).

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Num } from '@/components/ui/Num';
import { fmtNumber } from '@/lib/formatters';
import { Karat } from '@/lib/types';
import { useT } from '@/i18n';

export interface KaratAllocation {
  karat: Karat;
  grams: number;
}

interface AllocationBarProps {
  allocations: KaratAllocation[];
  className?: string;
}

const karatColor: Record<Karat, string> = {
  24: 'bg-karat-24',
  22: 'bg-karat-22',
  21: 'bg-karat-21',
  18: 'bg-karat-18',
};

const ORDER: Karat[] = [24, 22, 21, 18];

export const AllocationBar: React.FC<AllocationBarProps> = ({ allocations, className = '' }) => {
  const t = useT();
  const sorted = ORDER.map((k) => allocations.find((a) => a.karat === k)).filter(
    (a): a is KaratAllocation => Boolean(a) && a!.grams > 0
  );
  const total = sorted.reduce((sum, a) => sum + a.grams, 0);
  const pct = (grams: number) => (total > 0 ? (grams / total) * 100 : 0);

  return (
    <Card height="small" padding="normal" className={`justify-between ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-h4 font-semibold text-fg m-0">{t.allocation.title}</h4>
        <span className="text-sm text-fg-subtle">
          {t.allocation.total} <Num value={total} format="grams" className="text-fg-muted" />
        </span>
      </div>

      <div className="flex w-full h-3 gap-0.5 overflow-hidden rounded-xs bg-muted" aria-hidden="true">
        {sorted.map((a) => (
          <div key={a.karat} className={`h-full ${karatColor[a.karat]}`} style={{ width: `${pct(a.grams)}%` }} />
        ))}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 m-0">
        {sorted.map((a) => (
          <div key={a.karat} className="flex flex-col min-w-0">
            <dt className="flex items-center gap-2 text-sm text-fg-subtle">
              <span className={`size-2 rounded-2xs shrink-0 ${karatColor[a.karat]}`} aria-hidden="true" />
              {t.units.karat(a.karat)}
            </dt>
            <dd className="m-0 text-body font-semibold text-fg">
              <Num value={a.grams} format="grams" />{' '}
              <bdi className="num text-sm font-normal text-fg-subtle">
                {fmtNumber(Math.round(pct(a.grams) * 10) / 10)}%
              </bdi>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};
