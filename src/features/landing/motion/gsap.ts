// src/features/landing/motion/gsap.ts
// GSAP is used on the landing route only (07-motion §1): this module is imported solely by
// the lazily loaded landing chunk, so it never ships in the app bundle.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import { gsapT } from '@/motion/tokens';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
ScrollTrigger.config({ ignoreMobileResize: true });

// Arabic metrics change line breaks once the web fonts arrive (07-motion §4.1)
if (typeof document !== 'undefined') {
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}

// The three matchMedia contexts every landing timeline uses (07-motion §4.1)
export const MQ = {
  desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
  tablet: '(min-width: 768px) and (prefers-reduced-motion: no-preference)',
  mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
  reduce: '(prefers-reduced-motion: reduce)',
} as const;

// Durations/eases from the motion tokens (07-motion §2), in seconds
export const T = gsapT;

export { gsap, ScrollTrigger, SplitText, useGSAP };
