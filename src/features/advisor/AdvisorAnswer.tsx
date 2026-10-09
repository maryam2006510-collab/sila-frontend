// src/features/advisor/AdvisorAnswer.tsx
// The advisor's reply, in two registers (D38):
// - AnswerText: the prose as plain text, in the AI line style (06-style §6.3, the one place
//   Sparkle is used). Numbers inside it stand out (Montserrat, tabular, semibold, isolated).
// - AdvisorFigures: the live figures from the server's data (never parsed from the text), one per
//   line with label and value, shown only for questions about prices, money, budget or holdings.

import React from 'react';
import { CaretDownIcon, CaretUpIcon, SparkleIcon, WarningIcon } from '@phosphor-icons/react';
import { Num } from '@/components/ui/Num';
import { fmtPct, fmtTime } from '@/lib/formatters';
import type { AdvisorAnswer } from '@/lib/types';
import { useT } from '@/i18n';

// A figure inside the prose: digits with their grouping/decimals and an optional percent sign
// (a space before a percent sign belongs to it; the space after a number stays in the text)
const FIGURE = /(\d[\d,.٫٬]*(?:\s?[%٪])?)/;

export const AnswerText: React.FC<{ text: string; source: string }> = ({ text, source }) => (
  <div className="rounded-sm bg-muted py-3 px-4 flex items-start gap-3 text-start">
    <SparkleIcon size={16} weight="regular" className="shrink-0 mt-1.5 text-line-focus" aria-hidden="true" />
    <div className="flex-1 min-w-0 flex flex-col gap-1">
      <p className="m-0 text-body text-fg">
        {text.split(FIGURE).map((part, i) =>
          // split() with a capture group puts the matches at odd indexes
          i % 2 === 1 ? (
            <bdi key={i} className="num font-semibold">
              {part}
            </bdi>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </p>
      <p className="m-0 text-sm text-fg-subtle">{source}</p>
    </div>
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode; note?: string }> = ({ label, children, note }) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
    <dt className="text-sm text-fg-subtle">{label}</dt>
    <dd className="m-0 flex flex-col items-end">
      <span className="flex items-baseline gap-2 text-h4 font-semibold text-fg">{children}</span>
      {note && <span className="text-sm text-fg-subtle">{note}</span>}
    </dd>
  </div>
);

export const AdvisorFigures: React.FC<{ answer: AdvisorAnswer }> = ({ answer }) => {
  const t = useT();
  const s = t.advisor;
  const { market, budget } = answer;
  const change = market.change_24h_pct;
  const up = (change ?? 0) >= 0;
  const Caret = up ? CaretUpIcon : CaretDownIcon;

  return (
    <section aria-label={s.figuresTitle} className="rounded-md border border-line-subtle bg-surface-1 px-4 py-2">
      <dl className="m-0 divide-y divide-line-subtle">
        <Row label={s.price24} note={s.updatedAt(fmtTime(market.updated_at))}>
          <Num value={market.price_24k_per_gram} format="iqd" />
          {/* No 24h change yet (null): no delta rather than a fake 0% */}
          {change !== null && (
            <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? 'text-up' : 'text-down'}`}>
              <Caret size={16} weight="fill" aria-hidden="true" />
              <bdi className="num">{fmtPct(change)}</bdi>
            </span>
          )}
        </Row>
        {budget?.confirmed && (
          <Row label={s.yourBudget}>
            <Num value={budget.amount_iqd} format="iqd" />
          </Row>
        )}
        <Row label={s.holdings} note={answer.holdings_grams > 0 ? undefined : s.holdingsEmpty}>
          <Num value={answer.holdings_grams} format="grams" />
        </Row>
      </dl>
      {market.is_stale && (
        <p className="m-0 flex items-start gap-2 pb-3 text-sm text-warning-fg">
          <WarningIcon size={16} className="shrink-0 mt-1" aria-hidden="true" />
          {s.stale}
        </p>
      )}
    </section>
  );
};
