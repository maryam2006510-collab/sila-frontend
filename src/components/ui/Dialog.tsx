// src/components/ui/Dialog.tsx
// Modal Dialog per UI Kit 04-layout §10 & 06-style §5.7 & 07-motion §3 (#4)
// Below 768px it docks to the bottom as a sheet (04-layout §10 "all modals on < 768").

import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { XIcon } from '@phosphor-icons/react';
import { ease, duration } from '@/motion/tokens';
import { useT } from '@/i18n';
import { useBodyScrollLock } from '@/lib/hooks';

export type DialogSize = 'sm' | 'md' | 'lg';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: DialogSize;
  children: React.ReactNode;
  showCloseButton?: boolean;
  // Scrim click / Escape close the dialog; defaults to showCloseButton
  dismissible?: boolean;
}

const sizeClasses: Record<DialogSize, string> = {
  sm: 'md:max-w-110',
  md: 'md:max-w-g5',
  lg: 'md:max-w-g6',
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  showCloseButton = true,
  dismissible,
}) => {
  const t = useT();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const canDismiss = dismissible ?? showCloseButton;

  useBodyScrollLock(isOpen);

  // Focus moves into the dialog and returns to the trigger on close
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => {
      // Respect a child that already took focus (React's autoFocus focuses without the attribute)
      if (panelRef.current?.contains(document.activeElement)) return;
      panelRef.current?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canDismiss) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, canDismiss, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-modal flex items-end md:items-center justify-center md:p-4">
          {/* Navy scrim, never black; no blur in the app (06-style §4) */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: duration.dur2 / 1000 } }}
            transition={{ duration: duration.dur3 / 1000 }}
            className="fixed inset-0 bg-scrim"
            onClick={canDismiss ? onClose : undefined}
            aria-hidden="true"
          />

          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: duration.dur2 / 1000, ease: ease.in } }}
            transition={{ duration: duration.dur4 / 1000, ease: ease.outExpo }}
            className={`relative w-full ${sizeClasses[size]} max-h-sheet overflow-y-auto rounded-t-lg md:rounded-lg bg-surface-1 dark:bg-surface-2 border border-line shadow-lg p-5 md:p-8 flex flex-col outline-none`}
          >
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-line-subtle">
                {title ? (
                  <h3 id={titleId} className="text-h3 font-semibold text-fg m-0">
                    {title}
                  </h3>
                ) : (
                  <span />
                )}

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label={t.common.close}
                    className="size-11 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg hover:bg-state-hover outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35 transition-colors dur-2 ease-standard"
                  >
                    <XIcon size={20} />
                  </button>
                )}
              </div>
            )}

            <div className="flex-1 text-start">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
};
