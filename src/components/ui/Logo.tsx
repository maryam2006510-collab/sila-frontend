// src/components/ui/Logo.tsx
// Sila Brand Logo per UI Kit 05-logo-usage.md
// Inline SVG with fill="currentColor": only Navy (Version 1) or White, set via CSS color.

import React from 'react';
import { Link } from 'react-router-dom';
import logoSvg from '@/assets/brand/sila-logo.svg?raw';
import iconSvg from '@/assets/brand/sila-icon.svg?raw';
import { useT } from '@/i18n';

interface LogoProps {
  variant?: 'full' | 'icon';
  // 'auto' = Navy on the light canvas, White on the dark canvas (05-logo §2)
  tone?: 'navy' | 'white' | 'auto';
  // Allowed sizes from 05-logo §3.2 (full ≥ 24, icon ≥ 20)
  height?: 24 | 28 | 32 | 40 | 52 | 84;
  className?: string;
  linkHome?: boolean;
}

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
  height = 32,
  className = '',
  linkHome = false,
}) => {
  const t = useT();
  const label = t.brand.homeLabel;
  // Full logo 3:1 (1320×440), icon 1:1 (441×440)
  const width = variant === 'full' ? height * 3 : height;

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
