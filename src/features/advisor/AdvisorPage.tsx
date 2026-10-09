// src/features/advisor/AdvisorPage.tsx
// AI Advisor (POST /api/ai/advisor, D37): a free question in Arabic → the server's answer, its
// suggestions (the Smart Match card, into the existing checkout) and the disclaimer under every
// answer. Each question is independent: the thread stays on screen, but no history is sent.
// Budget (decision 2026-10-08): the server reads it from the question. Words need the user's
// confirmation and no budget offers quick choices; nothing is guessed here. Every figure shown
// is the server's (adapters convert for display only, D21). The answer is plain text and the
// live figures sit in their own panel (D38); the quick questions follow the latest answer.

import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { InfoIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { fieldStateClasses } from '@/components/ui/fieldStyles';
import { AiThinking } from '@/components/fin/AiThinking';
import { MatchResultCard } from '@/components/fin/MatchResultCard';
import { useAppContext } from '@/features/shell/appContext';
import { AdvisorFigures, AnswerText } from './AdvisorAnswer';
import { api, errorMessage, hasErrorCode, isApiError } from '@/lib/api';
import { useNow } from '@/lib/hooks';
import { useOwnership } from '@/lib/queries';
import { fmtAmountWords, fmtIQD } from '@/lib/formatters';
import type { AdvisorAnswer } from '@/lib/types';
import { useT } from '@/i18n';

const MAX_QUESTION = 500;
const BUDGET_CHOICES = [250_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
// Used only when the server sends no Retry-After header
const RATE_LIMIT_FALLBACK_SECONDS = 60;

interface Entry {
  id: number;
  question: string;
  budget?: number;
  status: 'pending' | 'done' | 'error';
  answer?: AdvisorAnswer;
  // What the error state shows: the contract error_code and the server's Arabic message
  errorCode?: string;
  errorText?: string;
}

// ---- Budget editing inside an answer ---------------------------------------

const BudgetEditor: React.FC<{ initial: number; onSubmit: (b: number) => void; onCancel: () => void }> = ({
  initial,
  onSubmit,
  onCancel,
}) => {
  const t = useT();
  const s = t.advisor;
  const [value, setValue] = useState(initial);
  return (
    <div className="flex flex-col gap-3">
      <MoneyInput label={s.budgetLabel} value={value} onChangeValue={setValue} />
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" size="md" disabled={value <= 0} onClick={() => onSubmit(value)}>
          {s.useBudget}
        </Button>
        <Button variant="ghost" size="md" onClick={onCancel}>
          {s.cancel}
        </Button>
      </div>
    </div>
  );
};

const BudgetStep: React.FC<{ answer: AdvisorAnswer; disabled: boolean; onBudget: (b: number) => void }> = ({
  answer,
  disabled,
  onBudget,
}) => {
  const t = useT();
  const s = t.advisor;
  const [editing, setEditing] = useState(false);
  const budget = answer.budget;
  const amountText = (v: number) => `${fmtIQD(v)} ${t.units.iqd}`;

  if (editing) {
    return (
      <BudgetEditor
        initial={budget?.amount_iqd ?? 1_000_000}
        onSubmit={(b) => {
          setEditing(false);
          onBudget(b);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // No budget: quick choices, and no offers before one is chosen
  if (!budget) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body text-fg">{s.chooseBudget}</p>
        <div className="flex flex-wrap gap-2">
          {BUDGET_CHOICES.map((v) => (
            <Button key={v} variant="secondary" size="md" disabled={disabled} onClick={() => onBudget(v)}>
              {fmtAmountWords(v)} {t.units.iqd}
            </Button>
          ))}
          <Button variant="ghost" size="md" disabled={disabled} onClick={() => setEditing(true)}>
            {s.otherAmount}
          </Button>
        </div>
      </div>
    );
  }

  // Read from words: confirm before any offer
  if (!budget.confirmed) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-body font-medium text-fg">{s.confirmBudget(amountText(budget.amount_iqd))}</p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="md" disabled={disabled} onClick={() => onBudget(budget.amount_iqd)}>
            {s.confirmYes}
          </Button>
          <Button variant="secondary" size="md" disabled={disabled} onClick={() => setEditing(true)}>
            {s.edit}
          </Button>
        </div>
      </div>
    );
  }

  // Confirmed: the amount shows in the figures panel; only the edit action stays here
  return (
    <Button variant="ghost" size="md" className="self-start" disabled={disabled} onClick={() => setEditing(true)}>
      {s.editBudget}
    </Button>
  );
};

// ---- One question and its answer -------------------------------------------

const Exchange: React.FC<{
  entry: Entry;
  lockedFor: number;
  onAsk: (budget?: number) => void;
}> = ({ entry, lockedFor, onAsk }) => {
  const t = useT();
  const s = t.advisor;
  const { answer } = entry;

  let body: React.ReactNode = null;
  if (entry.status === 'pending') {
    body = <AiThinking label={s.thinking} rows={1} />;
  } else if (entry.status === 'error') {
    const limited = entry.errorCode === 'RATE_LIMITED';
    const message = limited
      ? s.rateLimited(lockedFor || RATE_LIMIT_FALLBACK_SECONDS)
      : entry.errorCode === 'AI_UNAVAILABLE'
        ? s.unavailable
        : entry.errorText || s.failed;
    body = (
      <Card padding="normal" className="gap-4">
        <p role="alert" className="m-0 flex items-start gap-2 text-body font-medium text-fg">
          <WarningOctagonIcon size={20} weight="fill" className="shrink-0 mt-1 text-danger-fg" aria-hidden="true" />
          {message}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="md" disabled={lockedFor > 0} onClick={() => onAsk(entry.budget)}>
            {s.retry}
          </Button>
          <Link to="/app/market" className="self-center text-body font-medium text-fg-link hover:text-fg-link-hover">
            {s.browseMyself}
          </Link>
        </div>
      </Card>
    );
  } else if (answer) {
    const confirmed = answer.budget?.confirmed ?? false;
    body = (
      <div className="flex flex-col gap-5">
        <AnswerText text={answer.answer} source={answer.engine === 'llm' ? s.sourceLlm : s.sourceRules} />

        {answer.show_figures && <AdvisorFigures answer={answer} />}

        <BudgetStep answer={answer} disabled={lockedFor > 0} onBudget={(b) => onAsk(b)} />

        {confirmed &&
          (answer.suggestions.length > 0 ? (
            <section className="flex flex-col gap-4" aria-label={s.suggestionsTitle}>
              <h3 className="m-0 text-h4 font-semibold text-fg">{s.suggestionsTitle}</h3>
              <ol className="m-0 p-0 list-none flex flex-col gap-5">
                {answer.suggestions.map((result) => (
                  <li key={result.listing.id}>
                    <MatchResultCard result={result} reasonSource={t.match.reasonSource} />
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <p className="m-0 text-body text-fg-muted">{s.noSuggestions}</p>
          ))}

        {/* The manual path next to every AI output (08-ux §0 #7) */}
        <Link to="/app/market" className="self-start text-body font-medium text-fg-link hover:text-fg-link-hover">
          {s.browseMyself}
        </Link>

        {/* The server's disclaimer, under every answer */}
        <p className="m-0 flex items-start gap-2 text-sm text-fg-subtle">
          <InfoIcon size={16} className="shrink-0 mt-1" aria-hidden="true" />
          {answer.disclaimer}
        </p>
      </div>
    );
  }

  return (
    <li className="flex flex-col gap-4">
      {/* The investor's question sits on the end side, the answer on the start side */}
      <div className="self-end max-w-g5 rounded-md bg-muted px-4 py-3">
        <p className="m-0 text-sm text-fg-subtle">{s.you}</p>
        <p className="m-0 text-body text-fg whitespace-pre-line">{entry.question}</p>
      </div>
      {body}
    </li>
  );
};

// ---- Page ------------------------------------------------------------------

export const AdvisorPage: React.FC = () => {
  const t = useT();
  const s = t.advisor;
  const questionId = useId();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [question, setQuestion] = useState('');
  const [withBudget, setWithBudget] = useState(false);
  const [budget, setBudget] = useState(1_000_000);
  const [lockedUntil, setLockedUntil] = useState(0);
  const nextId = useRef(1);
  const lastRef = useRef<HTMLDivElement>(null);
  const now = useNow(1_000);
  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1_000));
  const busy = entries.some((e) => e.status === 'pending');

  // Before any answer: fitted to the investor (holdings, risk profile). After one: the server's
  // follow-up questions for it, so the suggestions move with the conversation.
  const { user } = useAppContext();
  const holdings = useOwnership(user.role).data?.total_accumulated_grams ?? 0;
  const start = [
    holdings > 0 ? s.quickStart.holder : s.quickStart.first,
    s.quickStart.timing,
    s.quickStart.byRisk[user.risk_profile ?? 'medium'],
  ];
  const latest = [...entries].reverse().find((e) => e.status === 'done')?.answer;
  const followUps = latest?.follow_up_questions ?? [];
  const quick = followUps.length > 0 ? followUps : start;

  const update = (id: number, patch: Partial<Entry>) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const run = async (id: number, text: string, budgetIqd?: number) => {
    update(id, { budget: budgetIqd, status: 'pending', answer: undefined, errorCode: undefined, errorText: undefined });
    try {
      update(id, { status: 'done', answer: await api.askAdvisor(text, budgetIqd) });
    } catch (error) {
      if (hasErrorCode(error, 'RATE_LIMITED')) {
        const seconds = (isApiError(error) && error.retryAfter) || RATE_LIMIT_FALLBACK_SECONDS;
        // `now` ticks every second (useNow), close enough for a countdown in seconds
        setLockedUntil(now + seconds * 1_000);
      }
      update(id, {
        status: 'error',
        errorCode: isApiError(error) ? error.code : undefined,
        errorText: errorMessage(error, t.advisor.failed),
      });
    }
  };

  const ask = (raw: string) => {
    const text = raw.trim();
    if (!text || busy || lockedFor > 0) return;
    const id = nextId.current++;
    setEntries((list) => [...list, { id, question: text, status: 'pending' }]);
    setQuestion('');
    void run(id, text, withBudget && budget > 0 ? budget : undefined);
  };

  // Keep the newest exchange in view (instantly with reduced motion)
  const count = entries.length;
  useEffect(() => {
    if (!count) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    lastRef.current?.scrollIntoView?.({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [count]);

  return (
    <div className="mx-auto w-full max-w-g6 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-h3 md:text-h2 font-semibold text-fg">{s.title}</h1>
        <p className="m-0 text-body text-fg-muted">{s.intro}</p>
      </header>

      {count > 0 && (
        <ol className="m-0 p-0 list-none flex flex-col gap-8" aria-live="polite">
          {entries.map((entry) => (
            <Exchange
              key={entry.id}
              entry={entry}
              lockedFor={lockedFor}
              onAsk={(b) => void run(entry.id, entry.question, b)}
            />
          ))}
        </ol>
      )}
      <div ref={lastRef} />

      <Card padding="spacious" className="gap-5">
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor={questionId} className="text-sm font-medium text-fg-muted">
              {s.questionLabel}
            </label>
            <textarea
              id={questionId}
              rows={3}
              maxLength={MAX_QUESTION}
              value={question}
              placeholder={s.placeholder}
              aria-describedby={`${questionId}-hint`}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter starts a new line
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              className={`w-full rounded-sm bg-sunken px-4 py-3 text-body text-fg placeholder:text-fg-placeholder border outline-none resize-none transition-control dur-2 ease-standard ${fieldStateClasses()}`}
            />
            <div id={`${questionId}-hint`} className="flex flex-wrap justify-between gap-2 text-sm text-fg-subtle">
              <span>{s.privacyHint}</span>
              <bdi className="num">{s.counter(question.length, MAX_QUESTION)}</bdi>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="m-0 text-sm font-medium text-fg-muted">
              {followUps.length > 0 ? s.suggestedTitle : s.quickTitle}
            </p>
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant="secondary"
                  size="md"
                  disabled={busy || lockedFor > 0}
                  onClick={() => ask(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>

          {withBudget ? (
            <div className="flex flex-col gap-2">
              <MoneyInput label={s.budgetLabel} value={budget} onChangeValue={setBudget} />
              <Button
                type="button"
                variant="ghost"
                size="md"
                className="self-start"
                onClick={() => setWithBudget(false)}
              >
                {s.removeBudget}
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="md" className="self-start" onClick={() => setWithBudget(true)}>
              {s.addBudget}
            </Button>
          )}

          {lockedFor > 0 && (
            <p role="status" className="m-0 text-body text-fg-muted">
              {s.rateLimited(lockedFor)}
            </p>
          )}

          <Button
            type="submit"
            variant="accent"
            size="lg"
            fullWidth
            disabled={!question.trim() || busy || lockedFor > 0}
            loading={busy}
          >
            {s.send}
          </Button>
        </form>
      </Card>
    </div>
  );
};
