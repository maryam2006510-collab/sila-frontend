// src/motion/tokens.ts
// Motion Tokens per UI Kit 07-motion-system.md §2. The single source for every library:
// Motion reads these directly, GSAP through `gsapT` (seconds), CSS through tokens.css.

export const duration = {
  dur1: 80, // Press feedback, icon swap
  dur2: 130, // Hover color/border, exit small
  dur3: 210, // Tooltips, dropdowns, card lift
  dur4: 340, // Modals, sheets, tab indicator, digit roll
  dur5: 550, // Section reveals, tick flash, check draw
  dur6: 890, // Hero entrance, logo loader, sparkline draw
  dur7: 1440, // Ambient loops (pulse)
} as const;

export const ease = {
  standard: [0.2, 0, 0, 1] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  in: [0.4, 0, 1, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
} as const;

// Critically damped or close to it: money UI never wobbles (07-motion §2.2)
export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 34, mass: 1 },
  calm: { type: 'spring', stiffness: 180, damping: 26, mass: 1 },
} as const;

export const distance = {
  sm: 12,
  md: 20,
  lg: 32,
} as const;

export const stagger = {
  dense: 34,
  card: 55,
  hero: 89,
} as const;

// Radii Motion needs as numbers to keep corners round while a layout animation scales a box
export const radius = {
  sm: 8,
  md: 13,
} as const;

const s = (ms: number) => ms / 1000;

// Ready-made Motion transitions, so components never hand-pick a duration/ease pair
export const transition = {
  // Route change: new page fades in and rises 12px (07-motion §3 #3)
  page: { duration: s(duration.dur3), ease: ease.outExpo },
  // In-view section reveal (07-motion §4.6)
  reveal: { duration: s(duration.dur5), ease: ease.outExpo },
  // Small exits are faster than entrances (07-motion §2.1)
  exit: { duration: s(duration.dur2), ease: ease.in },
  fade: { duration: s(duration.dur3), ease: ease.standard },
} as const;

// GSAP speaks seconds and named eases (07-motion §2.2 table)
export const gsapT = {
  dur3: s(duration.dur3),
  dur4: s(duration.dur4),
  dur5: s(duration.dur5),
  dur6: s(duration.dur6),
  stagger: s(stagger.card),
  dense: s(stagger.dense),
  heroStagger: s(stagger.hero),
  scrub: 0.8,
} as const;
