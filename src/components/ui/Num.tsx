// src/components/ui/Num.tsx
// Financial Numeral Renderer per UI Kit 02-typography-system.md §4
// Montserrat tabular figures inside <bdi>, unit at 0.62em in the tertiary color.
// `countUp` (KPIs, 07-motion §3 #12): the first time the figure is seen it counts 0 → value
// (890ms, outExpo). Tabular digits keep the width still. Anime writes the text directly, so React
// never re-renders per frame (07-motion §1 rule 6); assistive tech reads the real value throughout.

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { JSAnimation } from 'animejs';
import { fmtIQD, fmtUSD, fmtGrams, fmtPct, fmtRate, fmtCompact, fmtNumber } from '@/lib/formatters';
import { useInViewOnce } from '@/lib/hooks';
import { duration } from '@/motion/tokens';
import { useT } from '@/i18n';

export type NumFormat = 'iqd' | 'usd' | 'grams' | 'pct' | 'rate' | 'compact' | 'plain';

interface NumProps {
  value: number;
  format?: NumFormat;
  suffix?: string;
  className?: string;
  standalone?: boolean;
  countUp?: boolean;
}

const FORMATTERS: Record<NumFormat, (v: number) => string> = {
  iqd: fmtIQD,
  usd: fmtUSD,
  grams: fmtGrams,
  pct: fmtPct,
  rate: fmtRate,
  compact: fmtCompact,
  plain: fmtNumber,
};

// Writes into React's own text node (never textContent, which would swap the node React updates)
const setText = (el: HTMLElement, text: string) => {
  if (el.firstChild) el.firstChild.nodeValue = text;
};

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export const Num: React.FC<NumProps> = ({
  value,
  format = 'iqd',
  suffix,
  className = '',
  standalone = false,
  countUp = false,
}) => {
  const t = useT();
  const defaultUnits: Partial<Record<NumFormat, string>> = {
    iqd: t.units.iqd,
    grams: t.units.grams,
    compact: t.units.iqd,
  };
  const formatValue = FORMATTERS[format];
  const unit = suffix ?? defaultUnits[format];

  const figure = useRef<HTMLSpanElement>(null);
  const latest = useRef(value);
  const running = useRef<JSAnimation | null>(null);
  // Counting only when motion is allowed; decided once per mount
  const counts = useRef(countUp && !reducedMotion());
  const seen = useInViewOnce(figure, { enabled: countUp });

  // The count always lands on the newest value
  useEffect(() => {
    latest.current = value;
  }, [value]);

  // Start from zero before the first paint, so the final figure never flashes first
  useLayoutEffect(() => {
    if (counts.current && figure.current) setText(figure.current, formatValue(0));
    // Mount only: later renders keep whatever the count has reached
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = figure.current;
    if (!counts.current || !seen || !el) return;
    counts.current = false;
    let cancelled = false;
    const state = { v: 0 };
    // Anime loads only when a count actually runs: Num is on every page, most never count
    import('animejs').then(({ animate }) => {
      if (cancelled) return;
      running.current = animate(state, {
        v: latest.current,
        duration: duration.dur6,
        ease: 'outExpo',
        onUpdate: () => {
          setText(el, formatValue(state.v));
        },
        onComplete: () => {
          setText(el, formatValue(latest.current));
          running.current = null;
        },
      });
    });
    return () => {
      cancelled = true;
      running.current?.cancel();
    };
  }, [seen, formatValue]);

  // A new value mid-count ends the count on the new figure (no replaying history, 07-motion §3.1)
  useEffect(() => {
    if (!running.current || !figure.current) return;
    running.current.cancel();
    running.current = null;
    setText(figure.current, formatValue(value));
  }, [value, formatValue]);

  return (
    <bdi
      className={`num inline-flex items-baseline gap-1 ${standalone ? 'num-standalone' : ''} ${className}`}
      dir="ltr"
    >
      <span ref={figure} aria-hidden={countUp || undefined}>
        {formatValue(value)}
      </span>
      {countUp && <span className="sr-only">{formatValue(value)}</span>}
      {unit && (
        <span className="num-unit" aria-hidden="true">
          {unit}
        </span>
      )}
    </bdi>
  );
};
