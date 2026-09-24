// src/lib/hooks.ts
// Small shared hooks for live data UI

import { useEffect, useRef, useState } from 'react';

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
