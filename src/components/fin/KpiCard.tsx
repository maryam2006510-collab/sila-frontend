// src/components/fin/KpiCard.tsx
// KPI card per UI Kit 04-layout §8.2 & 06-style §6.6: height 136, label + value + delta, no charts.

import React from 'react';
import { CaretUpIcon, CaretDownIcon, WarningOctagonIcon, Icon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { fmtPct } from '@/lib/formatters';
import { DataStatus } from '@/lib/queryStatus';
import { useT } from '@/i18n';

// 'loading' and 'error' replace the figure: a value that did not arrive is never shown as 0
type KpiStatus = DataStatus;

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: Icon;
  deltaPct?: number;
  // Helper line; with a delta it reads as the comparison period
  deltaLabel?: string;
  // Replaces deltaLabel in narrow cards, when the full text would lose information to truncation
  deltaLabelShort?: string;
  status?: KpiStatus;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  icon: IconComponent,
  deltaPct,
  deltaLabel,
  deltaLabelShort,
  status = 'ready',
  className = '',
}) => {
  const t = useT();
  const isUp = deltaPct !== undefined && deltaPct >= 0;
  const Caret = isUp ? CaretUpIcon : CaretDownIcon;
  const ready = status === 'ready';

  return (
    <Card
      height="kpi"
      padding="normal"
      aria-busy={status === 'loading' || undefined}
      className={`@container justify-between ${className}`}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-fg-subtle min-w-0">
        <IconComponent size={20} weight="regular" className="text-fg-muted shrink-0" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>

      {/* A figure is never truncated (a clipped balance reads as a different number): the size
          steps down with the card width instead (down to body in a 2-up phone card), so tens of
          millions of dinars still fit */}
      {status === 'loading' ? (
        <div className="h-control-sm w-3/5 rounded-xs skeleton-loading" aria-hidden="true" />
      ) : status === 'error' ? (
        <p className="m-0 flex items-center gap-2 text-body font-medium text-danger-fg">
          <WarningOctagonIcon size={20} weight="fill" className="shrink-0" aria-hidden="true" />
          {t.kpi.unavailable}
        </p>
      ) : (
        <div
          data-kpi-value
          className="text-body @kpi-sm:text-h4 @kpi-md:text-h3 @kpi-lg:text-h2 font-semibold text-fg whitespace-nowrap"
        >
          {value}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
        {ready && deltaPct !== undefined && (
          <span className={`inline-flex items-center gap-1 font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
            <Caret size={16} weight="fill" aria-hidden="true" />
            <bdi className="num">{fmtPct(deltaPct)}</bdi>
          </span>
        )}
        {/* Narrow cards (2-up on phones): beside a delta the period label is dropped, and a helper
            alone steps down a size, so a date like "حتى 19 تشرين الأول 2026" keeps its year */}
        {ready && deltaLabel && (
          <span
            className={`text-fg-subtle truncate @max-kpi-sm:text-xs ${
              deltaPct !== undefined || deltaLabelShort ? '@max-kpi-sm:hidden' : ''
            }`}
          >
            {deltaLabel}
          </span>
        )}
        {ready && deltaLabelShort && (
          <span className="hidden @max-kpi-sm:inline text-xs text-fg-subtle truncate">{deltaLabelShort}</span>
        )}
      </div>
    </Card>
  );
};
