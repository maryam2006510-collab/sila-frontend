// src/components/ui/RollingNumber.tsx
// Rolling Digit Motion for Live Prices per UI Kit 07-motion-system.md §3.1 & §5.1
// Only changed digit columns move; reduced motion swaps values instantly (MotionConfig).

import React, { useEffect, useRef, useState } from 'react';
import * as m from 'motion/react-m';
import { spring } from '@/motion/tokens';
import { fmtNumber } from '@/lib/formatters';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const ANNOUNCE_EVERY_MS = 10_000;

const Digit: React.FC<{ digit: string }> = ({ digit }) => {
  if (!/\d/.test(digit)) {
    return <span className="inline-block select-none">{digit}</span>;
  }

  return (
    <span className="digit-col" aria-hidden="true">
      <m.span className="digit-stack" animate={{ y: `${-Number(digit) * 10}%` }} transition={spring.snappy}>
        {DIGITS.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </m.span>
    </span>
  );
};

interface RollingNumberProps {
  value: number;
  format?: (v: number) => string;
  suffix?: string;
  className?: string;
  // Only the page's main price announces changes to screen readers (throttled)
  announce?: boolean;
}

export const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  format = fmtNumber,
  suffix,
  className = '',
  announce = false,
}) => {
  const text = format(value);
  const fullLabel = suffix ? `${text} ${suffix}` : text;

  const [spoken, setSpoken] = useState(fullLabel);
  const lastSpoken = useRef(0);
  useEffect(() => {
    if (!announce) return;
    const wait = Math.max(0, ANNOUNCE_EVERY_MS - (Date.now() - lastSpoken.current));
    const timer = setTimeout(() => {
      lastSpoken.current = Date.now();
      setSpoken(fullLabel);
    }, wait);
    return () => clearTimeout(timer);
  }, [announce, fullLabel]);

  const chars = text.split('');

  return (
    <bdi className={`num inline-flex items-baseline ${className}`} dir="ltr">
      <span className="sr-only" aria-live={announce ? 'polite' : undefined}>
        {announce ? spoken : fullLabel}
      </span>
      {/* Keyed from the right so a column keeps its identity when the length changes */}
      {chars.map((char, index) => (
        <Digit key={chars.length - index} digit={char} />
      ))}
      {suffix && (
        <span className="num-unit ms-1" aria-hidden="true">
          {suffix}
        </span>
      )}
    </bdi>
  );
};
