// src/features/landing/PremiumBento.tsx
// Premium per UI Kit 08-ux §12 #9: a bento of exactly three cells, each with a real mini
// visual (alerts list, trend sparkline, allocation bar), plus the free Smart Match statement.

import React from 'react';
import { BellIcon, TrendUpIcon, ChartLineUpIcon, CrownIcon } from '@phosphor-icons/react';
import { Sparkline } from '@/components/fin/Sparkline';
import { noOrphan } from '@/lib/noOrphan';
import { useT } from '@/i18n';

const TREND = [108_900, 109_600, 109_200, 110_400, 110_100, 111_300, 111_050, 112_514];
const ALLOCATION = [
  { tone: 'bg-karat-24', share: 66.9 },
  { tone: 'bg-karat-21', share: 33.1 },
];

export const PremiumBento: React.FC = () => {
  const t = useT();
  const p = t.landing.premium;

  return (
    <section
      aria-label={p.title}
      className="cv-auto container-landing px-5 md:px-8 xl:px-13 py-21 lg:py-34 flex flex-col gap-13"
    >
      <div className="flex flex-col gap-3">
        <h2 className="m-0 flex items-center gap-3 text-h2 sm:text-h1 lg:text-display-lg font-bold text-fg">
          <CrownIcon size={52} className="text-fg-gold shrink-0" aria-hidden="true" />
          <span data-reveal>{noOrphan(p.title)}</span>
        </h2>
        <p data-reveal-block className="m-0 text-h4 font-normal text-fg-muted">
          {p.free}
        </p>
      </div>

      {/* Bento: one wide cell + two stacked cells (not three identical cards) */}
      <div className="grid grid-cols-1 md:grid-cols-golden gap-5">
        <article
          data-reveal-item
          className="md:row-span-2 rounded-md bg-surface-1 border border-line p-8 flex flex-col gap-5"
        >
          <h3 className="m-0 flex items-center gap-2 text-h3 font-semibold text-fg">
            <TrendUpIcon size={32} className="text-fg-muted" aria-hidden="true" />
            {p.trendTitle}
          </h3>
          <p className="m-0 text-h2 font-semibold text-up">{p.trendValue}</p>
          <Sparkline data={TREND} height={136} className="mt-auto" />
        </article>

        <article data-reveal-item className="rounded-md bg-surface-1 border border-line p-5 flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-h4 font-semibold text-fg">
            <BellIcon size={24} className="text-fg-muted" aria-hidden="true" />
            {p.alertsTitle}
          </h3>
          <ul className="m-0 p-0 list-none flex flex-col divide-y divide-line-subtle">
            {[p.alertA, p.alertB].map((a) => (
              <li key={a} className="py-2 text-body text-fg-muted">
                {a}
              </li>
            ))}
          </ul>
        </article>

        <article data-reveal-item className="rounded-md bg-surface-1 border border-line p-5 flex flex-col gap-3">
          <h3 className="m-0 flex items-center gap-2 text-h4 font-semibold text-fg">
            <ChartLineUpIcon size={24} className="text-fg-muted" aria-hidden="true" />
            {p.reportTitle}
          </h3>
          <div className="flex w-full h-3 gap-0.5 overflow-hidden rounded-xs" aria-hidden="true">
            {ALLOCATION.map((a) => (
              <span key={a.tone} className={`h-full ${a.tone}`} style={{ width: `${a.share}%` }} />
            ))}
          </div>
          <p className="m-0 text-body text-up">
            <bdi className="num">+4.80%</bdi>
          </p>
        </article>
      </div>
    </section>
  );
};
