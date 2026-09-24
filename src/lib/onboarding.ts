// src/lib/onboarding.ts
// "ابدأ من هنا" checklist (08-ux §4 Screen 1.4): items tick themselves as the investor acts.
// Per-viewer convenience only, so browser storage is enough (wrapped: storage may be blocked).

import { useCallback, useState } from 'react';

type Step = 'pricesSeen' | 'matchTried';
const KEY = (userId: string, name: string) => `sila-onboarding-${userId}-${name}`;

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
};

const write = (key: string) => {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: the checklist simply does not persist
  }
};

export const markOnboardingStep = (userId: string, step: Step) => write(KEY(userId, step));

export const useOnboarding = (userId: string) => {
  const [dismissed, setDismissed] = useState(() => read(KEY(userId, 'dismissed')));
  const dismiss = useCallback(() => {
    write(KEY(userId, 'dismissed'));
    setDismissed(true);
  }, [userId]);

  return {
    dismissed,
    dismiss,
    pricesSeen: read(KEY(userId, 'pricesSeen')),
    matchTried: read(KEY(userId, 'matchTried')),
  };
};
