// src/lib/noOrphan.ts
// Prevents single-word last lines (orphans/widows) per 02-typography-system.md §5

export const noOrphan = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/\s+(\S+)\s*$/, '\u00A0$1');
};
