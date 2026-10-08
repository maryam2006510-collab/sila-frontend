// src/components/fin/MatchResultCard.tsx
// One ranked suggestion from the matcher (UI Kit 08-ux §7, Screen 4.3): listing essentials, the
// server's figures, the AI reason line and "buy this" into the existing checkout. Shared by Smart
// Match and the AI Advisor, whose suggestions have the same shape.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SealCheckIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Num } from '@/components/ui/Num';
import { AiInsight } from './AiInsight';
import { fmtRate } from '@/lib/formatters';
import type { MatchResult } from '@/lib/types';
import { useT } from '@/i18n';

interface MatchResultCardProps {
  result: MatchResult;
  // Source line under the reason ("rules" or "llm" wording)
  reasonSource: string;
}

export const MatchResultCard: React.FC<MatchResultCardProps> = ({ result, reasonSource }) => {
  const t = useT();
  const s = t.match;
  const navigate = useNavigate();
  const item = result.listing;
  const best = result.rank === 1;

  return (
    // The best match is emphasized with the selected line, not with gold
    <Card padding="normal" selected={best} className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Chip karat={item.karat} />
          <span className="flex items-center gap-1 text-sm text-fg-muted min-w-0">
            {item.seller_verified && (
              <SealCheckIcon
                size={16}
                weight="fill"
                className="text-line-focus shrink-0"
                aria-label={t.shell.verified}
              />
            )}
            <span className="truncate">{item.seller_name}</span>
          </span>
        </div>
        {best && <span className="text-sm font-semibold text-state-indicator">{s.bestMatch}</span>}
      </div>

      <h3 className="text-h4 font-semibold text-fg m-0 truncate">{t.listing.title(item.karat)}</h3>

      <dl className="m-0 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <dt className="text-sm text-fg-subtle">{s.youGet}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={result.suggested_weight_grams} format="grams" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{s.livePrice}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={result.execution_price_per_gram} format="iqd" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{s.estimatedTotal}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={result.estimated_total_iqd} format="iqd" />
          </dd>
          <dd className="m-0 text-sm text-fg-subtle">{s.budgetShare(fmtRate(result.budget_usage_pct))}</dd>
        </div>
      </dl>

      <AiInsight text={result.reason} source={reasonSource} />

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" size="md" onClick={() => navigate(`/app/market/${item.id}`)}>
          {t.listing.details}
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() =>
            navigate(`/app/checkout/${item.id}`, { state: { initialGrams: result.suggested_weight_grams } })
          }
        >
          {s.buyThis}
        </Button>
      </div>
    </Card>
  );
};
