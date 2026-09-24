// src/components/ui/Segmented.tsx
// Segmented Control with Sliding Indicator per UI Kit 06-visual-style-fintech.md §5.3

import React from 'react';
import * as m from 'motion/react-m';
import { spring } from '@/motion/tokens';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  // Unique per instance: drives the shared layout animation of the indicator
  name?: string;
  ariaLabel?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
  name = 'segmented-indicator',
  ariaLabel,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex w-fit max-w-full items-center h-control-md p-1 rounded-sm bg-muted border border-line-subtle relative select-none ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;

        return (
          <button
            key={String(opt.value)}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`relative flex items-center justify-center h-full px-3 rounded-xs text-sm outline-none transition-colors dur-2 ease-standard focus-visible:ring-3 focus-visible:ring-line-focus/35 ${
              isSelected ? 'font-semibold text-fg' : 'font-medium text-fg-muted hover:text-fg'
            }`}
          >
            {isSelected && (
              <m.span
                layoutId={name}
                transition={spring.snappy}
                className="absolute inset-0 rounded-xs bg-surface-1 dark:bg-surface-3 border border-line-strong"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
