// src/components/ui/Toast.tsx
// Toast Notifications per UI Kit 06-visual-style-fintech.md §5.6 & 07-motion §3 (#8)
// Transient confirmations only; money and form feedback stays inline (08-ux §3.6).

import React, { useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import { CheckCircleIcon, WarningOctagonIcon, InfoIcon, XIcon } from '@phosphor-icons/react';
import { duration, ease } from '@/motion/tokens';
import { t as messages } from '@/i18n';
import { useToastStore, ToastItem, ToastType } from './toastStore';

const AUTO_DISMISS_MS = 5000;

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircleIcon size={20} weight="fill" className="text-success-fg" />,
  danger: <WarningOctagonIcon size={20} weight="fill" className="text-danger-fg" />,
  info: <InfoIcon size={20} weight="fill" className="text-info-fg" />,
};

const ToastCard: React.FC<{ toast: ToastItem }> = ({ toast: item }) => {
  const removeToast = useToastStore((s) => s.removeToast);
  const onClose = () => removeToast(item.id);

  // Timer depends on the toast only, so other toasts arriving never restart it
  useEffect(() => {
    const ms = item.duration ?? AUTO_DISMISS_MS;
    if (ms <= 0) return;
    const timer = setTimeout(() => removeToast(item.id), ms);
    return () => clearTimeout(timer);
  }, [item, removeToast]);

  return (
    <m.div
      layout
      role={item.type === 'danger' ? 'alert' : 'status'}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: duration.dur2 / 1000, ease: ease.in } }}
      transition={{ duration: duration.dur4 / 1000, ease: ease.outExpo }}
      className="pointer-events-auto rounded-md bg-surface-3 border border-line-strong shadow-lg p-4 flex items-start gap-3 text-start"
    >
      <span className="shrink-0" aria-hidden="true">
        {icons[item.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-body font-semibold text-fg m-0">{item.title}</p>
        {item.message && <p className="text-sm text-fg-muted m-0">{item.message}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={messages.common.close}
        className="shrink-0 size-11 -m-3 inline-flex items-center justify-center rounded-sm text-fg-subtle hover:text-fg outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
      >
        <XIcon size={16} />
      </button>
    </m.div>
  );
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);

  // Bottom inline-end; above the mobile tab bar
  return (
    <div className="fixed bottom-20 lg:bottom-5 inset-x-5 lg:start-auto lg:end-5 lg:w-95 z-toast flex flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((item) => (
          <ToastCard key={item.id} toast={item} />
        ))}
      </AnimatePresence>
    </div>
  );
};
