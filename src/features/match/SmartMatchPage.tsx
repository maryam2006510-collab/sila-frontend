// src/features/match/SmartMatchPage.tsx
// AI Smart Matching per UI Kit 08-ux-user-flows.md §7 (workflow 04)
// Budget → thinking → results (POST /api/ai/match). The risk profile is added server-side from
// the account; every figure shown (grams, price, total, budget share) is the server's.

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { InfoIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Tooltip } from '@/components/ui/Tooltip';
import { AiThinking } from '@/components/fin/AiThinking';
import { MatchResultCard } from '@/components/fin/MatchResultCard';
import { useAppContext } from '@/features/shell/appContext';
import { api, errorMessage } from '@/lib/api';
import { markOnboardingStep } from '@/lib/onboarding';
import { fmtAmountWords, fmtIQD } from '@/lib/formatters';
import { useT } from '@/i18n';

const BUDGET_CHIPS = [500_000, 1_000_000, 5_000_000, 10_000_000];

export const SmartMatchPage: React.FC = () => {
  const t = useT();
  const s = t.match;
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppContext();

  const initialBudget = (location.state as { initialBudget?: number } | null)?.initialBudget ?? 1_000_000;
  const [budget, setBudget] = useState(initialBudget);
  const match = useMutation({ mutationFn: (budgetIqd: number) => api.matchBudget(budgetIqd) });

  useEffect(() => {
    markOnboardingStep(user.id, 'matchTried');
  }, [user.id]);

  const riskName = t.auth.riskName[user.risk_profile ?? 'medium'];

  // ---- Budget (Screen 4.1) ---------------------------------------------
  const budgetForm = (
    <Card padding="spacious" className="gap-5">
      <h1 className="text-h3 md:text-h2 font-semibold text-fg m-0">{s.title}</h1>

      <MoneyInput
        label={s.budgetLabel}
        isXL
        value={budget}
        onChangeValue={setBudget}
        suggestions={BUDGET_CHIPS}
        suggestionLabel={(v) => `${fmtAmountWords(v)} ${t.units.iqd}`}
      />

      <p className="m-0 flex items-center gap-1 text-body text-fg-muted">
        {s.riskLine(riskName)}
        <Tooltip content={s.riskTooltip}>
          <InfoIcon size={16} aria-label={s.riskTooltip} />
        </Tooltip>
      </p>

      <Button
        variant="accent"
        size="xl"
        fullWidth
        disabled={budget <= 0}
        loading={match.isPending}
        onClick={() => match.mutate(budget)}
      >
        {s.start}
      </Button>

      <Link to="/app/market" className="self-center text-body font-medium text-fg-link hover:text-fg-link-hover">
        {s.browseMyself}
      </Link>
    </Card>
  );

  // ---- Thinking / results / edge states (Screens 4.2, 4.3) ------------
  const renderOutcome = () => {
    if (match.isPending) return <AiThinking label={s.thinking} />;

    if (match.isError) {
      return (
        <Card padding="spacious" className="items-center text-center gap-4">
          <WarningOctagonIcon size={32} weight="fill" className="text-danger-fg" aria-hidden="true" />
          <p className="m-0 text-h4 font-semibold text-fg">{errorMessage(match.error, s.unavailable)}</p>
          <Button variant="primary" size="md" onClick={() => navigate('/app/market')}>
            {s.browseMarket}
          </Button>
        </Card>
      );
    }

    const data = match.data;
    if (!data) return null;

    if (data.results.length === 0) {
      return (
        <Card padding="spacious" className="gap-4">
          <p className="m-0 text-h4 font-semibold text-fg">{data.message || s.noResults}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" size="md" onClick={() => match.reset()}>
              {s.editBudget}
            </Button>
            <Button variant="primary" size="md" onClick={() => navigate('/app/market')}>
              {s.browseMarket}
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h4 font-semibold text-fg m-0">{data.message}</h2>
            <p className="m-0 text-sm text-fg-subtle">
              {s.budgetLine} <bdi className="num">{fmtIQD(data.budget_iqd)}</bdi> {t.units.iqd}
            </p>
          </div>
          <Button variant="ghost" size="md" onClick={() => match.reset()}>
            {s.editBudget}
          </Button>
        </div>

        <ol className="m-0 p-0 list-none flex flex-col gap-5">
          {data.results.map((result) => (
            <li key={result.listing.id}>
              <MatchResultCard
                result={result}
                reasonSource={data.engine === 'llm' ? s.reasonSourceLlm : s.reasonSource}
              />
            </li>
          ))}
        </ol>

        <p className="m-0 text-sm text-fg-subtle">{s.disclosure}</p>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-g6 flex flex-col gap-8">
      {!match.data && budgetForm}
      {renderOutcome()}
    </div>
  );
};
