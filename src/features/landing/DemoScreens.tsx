// src/features/landing/DemoScreens.tsx
// The five walkthrough screens, built from the REAL app components with demo data
// (00-master §5.2, 06-style §8). No Motion-animated nodes here: these render inside a
// GSAP-pinned section (07-motion §1 rules 2-3).

import React from 'react';
import { CaretUpIcon, SealCheckIcon } from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Num } from '@/components/ui/Num';
import { Stepper } from '@/components/ui/Stepper';
import { Logo } from '@/components/ui/Logo';
import { Sparkline } from '@/components/fin/Sparkline';
import { AiInsight } from '@/components/fin/AiInsight';
import { OrderSummary } from '@/components/fin/OrderSummary';
import { SignatureCard } from '@/components/fin/SignatureCard';
import { KARATS, estimateOrder } from '@/lib/pricing';
import { useServerConfig } from '@/lib/queries';
import { fmtPct } from '@/lib/formatters';
import { TransactionPreview } from '@/lib/types';
import { useT } from '@/i18n';

// Organic demo figures (06-style §9 rule 5): never round "fake-perfect" numbers
const DEMO_24K = 112_514;
const DEMO_CHANGE = 0.0084;
const DEMO_SPARK = [111_580, 111_820, 111_700, 112_060, 111_940, 112_310, 112_514];
// 24K × 21/24, as the server prices karats
const DEMO_21K = Math.round((DEMO_24K * 21) / 24);
const DEMO_GRAMS = 12.5;
const DEMO_SIGNATURE = 'a3f98e7bc21e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7dc21e';

// Illustrative quote for the walkthrough. The commission uses the server's real tiers.
const demoPreview = (tiers: Parameters<typeof estimateOrder>[2]): TransactionPreview => {
  const est = estimateOrder(DEMO_GRAMS, DEMO_21K, tiers);
  const now = new Date().toISOString();
  return {
    asset_id: 'demo',
    karat: 21,
    purchased_weight_grams: DEMO_GRAMS,
    execution_price_per_gram: DEMO_21K,
    principal_amount: est.principal,
    commission_rate: est.rate,
    commission_amount: est.commission,
    total_paid_by_investor: est.total,
    price_updated_at: now,
    quoted_at: now,
    // Far enough ahead that the demo countdown never runs out
    quote_expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    quote_token: 'demo',
    risk_insight: null,
    risk_insight_note: null,
  };
};

const noop = () => {};

export const PricesScreen: React.FC = () => {
  const t = useT();
  return (
    <Card padding="normal" className="gap-4">
      <p className="m-0 flex items-center gap-2 text-sm font-semibold text-fg">
        <span className="live-indicator-square" aria-hidden="true" />
        {t.market.live} · {t.market.goldPrice}
      </p>
      <div className="flex items-baseline gap-3">
        <span className="text-h1 font-bold text-fg-gold">
          <Num value={DEMO_24K} format="iqd" suffix={t.units.perGram} standalone />
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-up">
          <CaretUpIcon size={16} weight="fill" aria-hidden="true" />
          <bdi className="num">{fmtPct(DEMO_CHANGE)}</bdi>
        </span>
      </div>
      <Sparkline data={DEMO_SPARK} height={84} />
      <dl className="m-0 grid grid-cols-4 gap-2 pt-3 border-t border-line-subtle">
        {KARATS.map((k) => (
          <div key={k}>
            <dt className="text-xs text-fg-subtle">{k}K</dt>
            <dd className="m-0 text-sm font-semibold text-fg">
              <Num value={Math.round((DEMO_24K * k) / 24)} format="plain" />
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
};

export const MatchScreen: React.FC = () => {
  const t = useT();
  return (
    <Card padding="normal" selected className="gap-4">
      <div className="flex items-center justify-between gap-2">
        <Chip karat={21} />
        <span className="text-sm font-semibold text-state-indicator">{t.match.bestMatch}</span>
      </div>
      <p className="m-0 text-h4 font-semibold text-fg">سبيكة ذهب عيار 21 · مجوهرات الكرّادة</p>
      <dl className="m-0 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-sm text-fg-subtle">{t.match.youGet}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={10.157} format="grams" />
          </dd>
        </div>
        <div>
          <dt className="text-sm text-fg-subtle">{t.match.livePrice}</dt>
          <dd className="m-0 text-h4 font-semibold text-fg">
            <Num value={DEMO_21K} format="iqd" />
          </dd>
        </div>
      </dl>
      <AiInsight
        text="يغطي ميزانيتك بالكامل: قرابة 10.16 غ من عيار 21. يناسب ملفك الاستثماري."
        source={t.match.reasonSource}
      />
    </Card>
  );
};

export const ReviewScreen: React.FC = () => {
  const tiers = useServerConfig().data?.commission_tiers;
  if (!tiers) return <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />;
  return <OrderSummary preview={demoPreview(tiers)} onConfirm={noop} />;
};

export const VerifyScreen: React.FC = () => {
  const t = useT();
  const k = t.kyc;
  return (
    <div className="rounded-lg overflow-hidden border border-line bg-surface-2">
      <div className="p-5 bg-surface-brand text-fg-on-brand flex items-center gap-3">
        <Logo variant="icon" tone="white" height={24} />
        <p className="m-0 text-h4 font-semibold">{k.title}</p>
      </div>
      <div className="p-5 flex flex-col items-center text-center gap-4">
        <Stepper
          steps={[
            { id: 'send', label: k.stepSend },
            { id: 'match', label: k.stepMatch },
            { id: 'approve', label: k.stepApprove },
          ]}
          currentStepIndex={3}
        />
        <SealCheckIcon size={52} weight="fill" className="text-success-fg" aria-hidden="true" />
        <p className="m-0 text-h3 font-semibold text-fg">{k.verifiedTitle}</p>
        <p className="m-0 text-body text-fg-muted">{k.verifiedBody}</p>
      </div>
    </div>
  );
};

export const OwnScreen: React.FC = () => {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <Card padding="normal" className="gap-1">
        <p className="m-0 text-body text-fg-muted">{t.portfolio.holdings}</p>
        <p className="m-0 text-h1 font-bold text-fg">
          <Num value={37.75} format="grams" standalone />
        </p>
      </Card>
      <SignatureCard token={DEMO_SIGNATURE} verified />
    </div>
  );
};
