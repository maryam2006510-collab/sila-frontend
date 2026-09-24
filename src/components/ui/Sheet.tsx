// src/components/ui/Sheet.tsx
// Bottom Sheet per UI Kit 04-layout-system.md §10 & 07-motion §3 (#5)

import React, { useEffect, useId } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { XIcon } from '@phosphor-icons/react';
import { spring, duration } from '@/motion/tokens';
import { useBodyScrollLock } from '@/lib/hooks';
import { useT } from '@/i18n';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, title, children }) => {
  const t = useT();
  const titleId = useId();
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex flex-col justify-end">
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration.dur3 / 1000 }}
            className="fixed inset-0 bg-scrim"
            onClick={onClose}
            aria-hidden="true"
          />

          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring.calm}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="relative w-full max-w-g6 mx-auto max-h-sheet rounded-t-lg bg-surface-1 dark:bg-surface-2 border-t border-line shadow-lg p-5 flex flex-col overflow-y-auto"
          >
            {/* Grab handle: a flat bar, not a pill */}
            <div className="w-10 h-1 rounded-2xs bg-line-strong mx-auto mb-4 shrink-0" aria-hidden="true" />

            {title && (
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line-subtle">
                <h3 id={titleId} className="text-h4 font-semibold text-fg m-0">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t.common.close}
                  className="size-11 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
                >
                  <XIcon size={20} />
                </button>
              </div>
            )}

            <div className="flex-1 text-start">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
