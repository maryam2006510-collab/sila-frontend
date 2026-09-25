// src/lib/hooks.ts
// Small shared hooks for live data UI

import React, { useEffect, useRef, useState } from 'react';

// Re-renders every `intervalMs` so relative labels ("قبل 12 ثانية") stay current (08-ux §3.1)
export const useNow = (intervalMs = 10_000): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

// Locks page scroll while a modal layer is open, restoring the previous value after
export const useBodyScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
};

// Prices older than this show the "last available price" warning (06-style §10)
export const STALE_AFTER_MS = 90_000;

export const isStale = (isoTime: string, now: number): boolean => now - new Date(isoTime).getTime() > STALE_AFTER_MS;

// Returns 'up' | 'down' for one flash period after `value` changes (07-motion §3.1: delta chip only)
export const useTickFlash = (value: number, durationMs = 550): 'up' | 'down' | null => {
  const previous = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value === previous.current) return;
    setFlash(value > previous.current ? 'up' : 'down');
    previous.current = value;
    const id = setTimeout(() => setFlash(null), durationMs);
    return () => clearTimeout(id);
  }, [value, durationMs]);

  return flash;
};

// True from the first time `ref` enters the viewport, then stays true (first-view animations,
// 07-motion §3 #10 and #12). IntersectionObserver, no scroll listener (07-motion §1 rule 6).
// `enabled: false` skips observing (the caller has nothing to animate). Without IntersectionObserver
// (old engines, test DOMs) everything counts as seen, so content is never held back.
export const useInViewOnce = (
  ref: React.RefObject<Element | null>,
  { enabled = true, rootMargin = '0px 0px -10% 0px' } = {}
): boolean => {
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || seen) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, enabled, rootMargin, seen]);
  return seen;
};

// Live media-query match, read synchronously on first render (client-only app), so a component can
// build only the variant it shows instead of rendering both and hiding one with CSS
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mql = window.matchMedia?.(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
};
