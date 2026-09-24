// src/components/ui/Badge.tsx
// Status and Meta Badges per UI Kit 01-color-system.md §6.1 & 06-visual-style-fintech.md §5.4
// Status is never color alone: tinted container + icon + words.

import React from 'react';
import {
  CheckCircleIcon,
  WarningOctagonIcon,
  WarningIcon,
  InfoIcon,
  MegaphoneIcon,
  PauseCircleIcon,
  ArchiveIcon,
} from '@phosphor-icons/react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'promoted' | 'suspended' | 'soldOut';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  // true = variant's default icon, false = none, or a custom node
  icon?: boolean | React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container: 'bg-success-bg border-success-line text-success-fg',
    icon: <CheckCircleIcon size={16} weight="fill" />,
  },
  danger: {
    container: 'bg-danger-bg border-danger-line text-danger-fg',
    icon: <WarningOctagonIcon size={16} weight="fill" />,
  },
  warning: {
    container: 'bg-warning-bg border-warning-line text-warning-fg',
    icon: <WarningIcon size={16} weight="fill" />,
  },
  info: {
    container: 'bg-info-bg border-info-line text-info-fg',
    icon: <InfoIcon size={16} weight="fill" />,
  },
  // Promoted: gold line + gold text, never a gold fill (06-style §5.4)
  promoted: {
    container: 'bg-transparent border-line-gold text-fg-gold',
    icon: <MegaphoneIcon size={16} weight="regular" />,
  },
  suspended: {
    container: 'bg-muted border-line-subtle text-fg-muted',
    icon: <PauseCircleIcon size={16} weight="regular" />,
  },
  soldOut: {
    container: 'bg-muted border-line-subtle text-fg-muted',
    icon: <ArchiveIcon size={16} weight="regular" />,
  },
  neutral: {
    container: 'bg-muted border-line-subtle text-fg-muted',
    icon: null,
  },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, icon = true, className = '' }) => {
  const { container, icon: defaultIcon } = styles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1 h-6 px-2 rounded-xs text-sm font-medium border select-none whitespace-nowrap ${container} ${className}`}
    >
      {icon && (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {typeof icon === 'boolean' ? defaultIcon : icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
};
