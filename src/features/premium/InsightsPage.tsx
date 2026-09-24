// src/features/premium/InsightsPage.tsx
// Premium AI insights per UI Kit 08-ux §10 Screen 7.3 (workflow 07, step 3)
// GET /api/ai/insights. Access is decided server-side (is_premium_active); 403
// SUBSCRIPTION_REQUIRED shows the locked structure (never blurred real data) with the offer.
// The figures are identical whichever engine (rules or LLM) wrote the text.

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellIcon,
  TrendUpIcon,
  TrendDownIcon,
  ChartLineUpIcon,
  LockSimpleIcon,
  CrownIcon,
  CaretUpIcon,
  CaretDownIcon,
  MinusIcon,
  Icon,
} from '@phosphor-icons/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Num } from '@/components/ui/Num';
import { ErrorState } from '@/components/ui/ErrorState';
import { hasErrorCode } from '@/lib/api';
import { useInsights } from '@/lib/queries';
import { isolateFigures } from '@/lib/bidi';
import { fmtPct } from '@/lib/formatters';
import { useT } from '@/i18n';

const PanelTitle: React.FC<{ icon: Icon; children: React.ReactNode }> = ({ icon: IconComponent, children }) => (
  <h2 className="text-h4 font-semibold text-fg m-0 flex items-center gap-2">
    <IconComponent size={24} className="text-fg-muted" aria-hidden="true" />
    {children}
  </h2>
);

// A signed change, or the "not enough history yet" note when the server sends null
const Change: React.FC<{ value: number | null; empty: string }> = ({ value, empty }) =>
  value === null ? (
    <span className="text-sm font-normal text-fg-subtle">{empty}</span>
  ) : (
    <bdi className={`num ${value > 0 ? 'text-up' : value < 0 ? 'text-down' : 'text-flat'}`}>{fmtPct(value)}</bdi>
  );

export const InsightsPage: React.FC = () => {
  const t = useT();
  const i = t.insights;
  const navigate = useNavigate();
  const query = useInsights();

  if (query.isPending) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-5 lg:gap-8" aria-busy="true">
        <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
        <div className="h-g4 rounded-md skeleton-loading" aria-hidden="true" />
      </div>
    );
  }

  // ---- Locked: structure only + the offer -------------------------------
  if (hasErrorCode(query.error, 'SUBSCRIPTION_REQUIRED')) {
    const panels = [
      { icon: BellIcon, title: i.alertsTitle },
      { icon: TrendUpIcon, title: i.trendTitle },
      { icon: ChartLineUpIcon, title: i.performanceTitle },
    ];
    return (
      <div className="flex flex-col gap-5">
        <Card padding="spacious" isGoldBorder className="gap-4">
          <div className="flex items-center gap-3">
            <CrownIcon size={32} className="text-fg-gold" aria-hidden="true" />
            <h1 className="text-h3 font-semibold text-fg m-0">{i.locked}</h1>
          </div>
          <p className="m-0 text-body text-fg-muted">{t.dashboard.premiumFreeMatch}</p>
          <Button variant="accent" size="lg" className="self-start" onClick={() => navigate('/app/premium')}>
            {t.premium.subscribeNow}
          </Button>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {panels.map(({ icon, title }) => (
            <Card key={title} height="small" padding="normal" className="gap-4" aria-disabled="true">
              <PanelTitle icon={icon}>{title}</PanelTitle>
              <div className="flex-1 flex items-center justify-center">
                <span className="size-16 inline-flex items-center justify-center rounded-md bg-muted border border-line-subtle text-fg-subtle">
                  <LockSimpleIcon size={32} aria-label={i.lockedPanel} />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <ErrorState message={i.loadFailed} onRetry={() => query.refetch()} />;
  }

  const { alerts, market: trend, portfolio: perf } = query.data;
  const TrendIcon = trend.trend === 'up' ? TrendUpIcon : trend.trend === 'down' ? TrendDownIcon : MinusIcon;
  const pnlUp = perf.unrealized_pnl_iqd >= 0;
  const PnlCaret = pnlUp ? CaretUpIcon : CaretDownIcon;

  return (
    <div className="flex flex-col gap-5 lg:gap-8">
      <div className="grid grid-cols-1 lg:grid-cols-golden gap-5 lg:gap-8 items-stretch">
        {/* Trend analysis (focal) */}
        <Card padding="spacious" className="gap-5">
          <PanelTitle icon={TrendUpIcon}>{i.trendTitle}</PanelTitle>
          <div className="flex flex-wrap items-baseline gap-3">
            <span
              className={`inline-flex items-center gap-2 text-h2 font-semibold ${
                trend.trend === 'up' ? 'text-up' : trend.trend === 'down' ? 'text-down' : 'text-flat'
              }`}
            >
              <TrendIcon size={32} aria-hidden="true" />
              {i.trend[trend.trend]}
            </span>
          </div>
          <p className="m-0 text-body text-fg-muted">{isolateFigures(trend.summary)}</p>
          <dl className="m-0 grid grid-cols-3 gap-3">
            {(
              [
                [i.change24h, trend.change_24h_pct],
                [i.change7d, trend.change_7d_pct],
                [i.change30d, trend.change_30d_pct],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-fg-subtle">{label}</dt>
                <dd className="m-0 text-body font-semibold">
                  <Change value={value} empty={i.notEnoughHistory} />
                </dd>
              </div>
            ))}
          </dl>
          <dl className="m-0 grid grid-cols-2 gap-5 pt-5 border-t border-line-subtle">
            <div>
              <dt className="text-sm text-fg-subtle">{i.low7d}</dt>
              <dd className="m-0 text-h4 font-semibold text-fg">
                {trend.low_7d === null ? (
                  <span className="text-sm font-normal text-fg-subtle">{i.notEnoughHistory}</span>
                ) : (
                  <Num value={trend.low_7d} format="iqd" />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{i.high7d}</dt>
              <dd className="m-0 text-h4 font-semibold text-fg">
                {trend.high_7d === null ? (
                  <span className="text-sm font-normal text-fg-subtle">{i.notEnoughHistory}</span>
                ) : (
                  <Num value={trend.high_7d} format="iqd" />
                )}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Portfolio performance report */}
        <Card padding="spacious" className="gap-5">
          <PanelTitle icon={ChartLineUpIcon}>{i.performanceTitle}</PanelTitle>
          <dl className="m-0 grid grid-cols-2 gap-5">
            <div>
              <dt className="text-sm text-fg-subtle">{i.unrealizedPct}</dt>
              <dd className="m-0 text-h4 font-semibold">
                <Change value={perf.unrealized_pnl_pct} empty={i.notEnoughHistory} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{i.pnl}</dt>
              <dd
                className={`m-0 text-h4 font-semibold inline-flex items-center gap-1 ${pnlUp ? 'text-up' : 'text-down'}`}
              >
                <PnlCaret size={16} weight="fill" aria-hidden="true" />
                <Num value={Math.abs(perf.unrealized_pnl_iqd)} format="iqd" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{i.currentValue}</dt>
              <dd className="m-0 text-body font-semibold text-fg">
                <Num value={perf.current_value_iqd} format="iqd" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-fg-subtle">{i.totalPaid}</dt>
              <dd className="m-0 text-body font-semibold text-fg">
                <Num value={perf.total_paid_iqd} format="iqd" />
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Smart alerts */}
      <Card padding="normal" className="gap-3">
        <PanelTitle icon={BellIcon}>{i.alertsTitle}</PanelTitle>
        {alerts.length === 0 ? (
          <p className="m-0 text-body text-fg-subtle">{i.noAlerts}</p>
        ) : (
          <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
            {alerts.map((alert) => (
              <li key={alert} className="flex items-start gap-3 py-3">
                <BellIcon size={20} className="text-fg-muted shrink-0 mt-1" aria-hidden="true" />
                <p className="m-0 flex-1 min-w-0 text-body text-fg">{isolateFigures(alert)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="m-0 text-sm text-fg-subtle">{t.match.disclosure}</p>
    </div>
  );
};
