// src/components/ui/Chip.tsx
// Filter & Karat Chip per UI Kit 06-visual-style-fintech.md §5.4
// Interactive only when `onClick` is given; otherwise it renders as a static label.

import React from 'react';
import { DiamondIcon } from '@phosphor-icons/react';
import { StateIcon } from './StateIcon';
import { Karat } from '@/lib/types';
import { useT } from '@/i18n';

interface ChipProps {
  children?: React.ReactNode;
  karat?: Karat;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({ children, karat, selected = false, onClick, icon, className = '' }) => {
  const t = useT();
  const content = karat ? t.units.karat(karat) : children;

  const base = `inline-flex items-center gap-2 h-control-sm px-3 rounded-xs text-sm font-medium select-none whitespace-nowrap ${
    selected
      ? 'bg-state-selected text-state-indicator selected-ring font-semibold'
      : 'bg-surface-1 border border-line text-fg-muted'
  } ${className}`;

  const inner = (
    <>
      {karat ? (
        <StateIcon icon={DiamondIcon} active={selected} size={16} />
      ) : (
        icon && (
          <span className="inline-flex" aria-hidden="true">
            {icon}
          </span>
        )
      )}
      <span>{content}</span>
    </>
  );

  if (!onClick) return <span className={base}>{inner}</span>;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} outline-none transition-control dur-2 ease-standard focus-visible:ring-3 focus-visible:ring-line-focus/35 ${
        selected ? '' : 'hover:border-line-strong hover:text-fg active:scale-98'
      }`}
    >
      {inner}
    </button>
  );
};
