// src/components/ui/Card.tsx
// Fixed-Height Uniform Container per UI Kit 04-layout-system.md §8

import React from 'react';

export type CardHeight = 'kpi' | 'small' | 'listing' | 'panel' | 'auto';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: CardHeight;
  interactive?: boolean;
  padding?: 'compact' | 'normal' | 'spacious';
  selected?: boolean;
  isGoldBorder?: boolean;
}

// Heights come from the golden ladder; content never resizes a card (04-layout §8.1)
const heightClasses: Record<CardHeight, string> = {
  kpi: 'h-g2',
  small: 'h-g3',
  listing: 'h-g4',
  panel: 'h-g5',
  auto: 'h-auto',
};

const paddingClasses = {
  compact: 'p-4',
  normal: 'p-5',
  spacious: 'p-8',
} as const;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      height = 'auto',
      interactive = false,
      padding = 'normal',
      selected = false,
      isGoldBorder = false,
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    // Selected uses an inset shadow, never a border-width change (no layout shift)
    const borderClasses = selected
      ? 'border-transparent selected-ring'
      : isGoldBorder
        ? 'border-line-gold'
        : 'border-line';

    return (
      <div
        ref={ref}
        className={`rounded-md bg-surface-1 border relative flex flex-col overflow-hidden shrink-0 transition-control dur-3 ease-standard ${
          heightClasses[height]
        } ${paddingClasses[padding]} ${borderClasses} ${
          interactive
            ? 'cursor-pointer hover:border-line-strong hover:-translate-y-0.5 hover:shadow-sm dark:hover:bg-surface-2 active:translate-y-0'
            : ''
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
