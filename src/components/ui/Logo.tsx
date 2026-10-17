// src/components/ui/Logo.tsx
// Sila Brand Mark per UI Kit 05-logo-usage.md: one symbol (an infinity loop cut by a 20° slash),
// no wordmark. Inline SVG with fill="currentColor": only Navy or White, set via CSS color.

import React from 'react';
import { Link } from 'react-router-dom';
import logoSvg from '@/assets/brand/sila-logo.svg?raw';
import iconSvg from '@/assets/brand/sila-icon.svg?raw';
import { useT } from '@/i18n';

// 05-logo §3: the mark is never under 48px wide (below that the slash disappears).
// Full mark: height 22 is the smallest that keeps 48px of width. The square icon draws the mark
// at 88% of its side, so it only reaches 48px from a side of 55: 84 is its one allowed size.
type FullHeight = 22 | 24 | 28 | 32 | 40 | 52 | 84;
type IconHeight = 84;

type LogoProps = {
  // 'auto' = Navy on the light canvas, White on the dark canvas (05-logo §2)
  tone?: 'navy' | 'white' | 'auto';
  className?: string;
  linkHome?: boolean;
} & ({ variant?: 'full'; height?: FullHeight } | { variant: 'icon'; height?: IconHeight });

// The SVG files are trusted build-time assets (src/assets/brand), not user content
const withSize = (svg: string) =>
  svg.replace('<svg ', '<svg width="100%" height="100%" aria-hidden="true" focusable="false" ');
const LOGO_MARKUP = { __html: withSize(logoSvg) };
const ICON_MARKUP = { __html: withSize(iconSvg) };

const toneClass = {
  navy: 'text-logo-navy',
  white: 'text-white',
  auto: 'text-logo-on-canvas',
} as const;

export const Logo: React.FC<LogoProps> = ({
  variant = 'full',
  tone = 'white',
  height = variant === 'icon' ? 84 : 32,
  className = '',
  linkHome = false,
}) => {
  const t = useT();
  const label = t.brand.homeLabel;
  // Full mark 1000 × 449.91 (about 2.22 : 1), icon 1:1
  const width = variant === 'full' ? Math.round((height * 1000) / 449.91) : height;

  // Block-level flex, never inline: an inline box sits on the text baseline and rides ~4px above
  // the centre of a nav row (D29)
  const mark = (
    <span
      role="img"
      aria-label={label}
      className={`flex shrink-0 select-none ${toneClass[tone]} ${className}`}
      style={{ width, height }}
      dangerouslySetInnerHTML={variant === 'full' ? LOGO_MARKUP : ICON_MARKUP}
    />
  );

  if (!linkHome) return mark;

  return (
    <Link
      to="/"
      aria-label={label}
      className="flex w-fit shrink-0 items-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
    >
      {mark}
    </Link>
  );
};
