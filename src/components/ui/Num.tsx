// src/components/ui/Num.tsx
// Financial Numeral Renderer per UI Kit 02-typography-system.md §4
// Montserrat tabular figures inside <bdi>, unit at 0.62em in the tertiary color.

import React from 'react';
import { fmtIQD, fmtUSD, fmtGrams, fmtPct, fmtRate, fmtCompact, fmtNumber } from '@/lib/formatters';
import { useT } from '@/i18n';

export type NumFormat = 'iqd' | 'usd' | 'grams' | 'pct' | 'rate' | 'compact' | 'plain';

interface NumProps {
  value: number;
  format?: NumFormat;
  suffix?: string;
  className?: string;
  standalone?: boolean;
}

export const Num: React.FC<NumProps> = ({ value, format = 'iqd', suffix, className = '', standalone = false }) => {
  const t = useT();

  const formatters: Record<NumFormat, [(v: number) => string, string | undefined]> = {
    iqd: [fmtIQD, t.units.iqd],
    usd: [fmtUSD, undefined],
    grams: [fmtGrams, t.units.grams],
    pct: [fmtPct, undefined],
    rate: [fmtRate, undefined],
    compact: [fmtCompact, t.units.iqd],
    plain: [fmtNumber, undefined],
  };

  const [formatValue, defaultUnit] = formatters[format];
  const unit = suffix ?? defaultUnit;

  return (
    <bdi
      className={`num inline-flex items-baseline gap-1 ${standalone ? 'num-standalone' : ''} ${className}`}
      dir="ltr"
    >
      <span>{formatValue(value)}</span>
      {unit && (
        <span className="num-unit" aria-hidden="true">
          {unit}
        </span>
      )}
    </bdi>
  );
};
