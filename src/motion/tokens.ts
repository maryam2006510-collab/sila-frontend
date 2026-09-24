// src/motion/tokens.ts
// Motion Tokens per UI Kit 07-motion-system.md §2

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
