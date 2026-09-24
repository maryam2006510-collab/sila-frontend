// src/components/ui/StateIcon.tsx
// Regular ↔ Fill crossfade per UI Kit 03-icon-system.md §2.1
// Both glyphs share one grid cell, so switching never changes the layout width.

import React from 'react';
import { Icon } from '@phosphor-icons/react';

interface StateIconProps {
  icon: Icon;
  active: boolean;
  // Icon size tokens only (03-icon §3)
  size?: 16 | 20 | 24 | 32;
  label?: string;
  mirrored?: boolean;
  className?: string;
}

export const StateIcon: React.FC<StateIconProps> = ({
  icon: IconComponent,
  active,
  size = 20,
  label,
  mirrored = false,
  className = '',
}) => (
  <span
    className={`state-icon shrink-0 ${className}`}
    role={label ? 'img' : undefined}
    aria-hidden={label ? undefined : true}
    aria-label={label}
  >
    <IconComponent size={size} weight="regular" mirrored={mirrored} data-on={!active} />
    <IconComponent size={size} weight="fill" mirrored={mirrored} data-on={active} />
  </span>
);
