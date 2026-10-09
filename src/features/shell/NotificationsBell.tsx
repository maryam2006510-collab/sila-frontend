// src/features/shell/NotificationsBell.tsx
// The topbar bell (D39): in-app notifications from GET /api/notifications, polled every minute.
// A dropdown on larger screens, a full-width panel under the topbar on phones. Opening an item
// marks it read and goes to its in-app link.

import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@phosphor-icons/react';
import { api } from '@/lib/api';
import { queryKeys, useNotifications } from '@/lib/queries';
import { fmtRelativeTime } from '@/lib/formatters';
import type { AppNotification, Notifications } from '@/lib/types';
import { useT } from '@/i18n';

export const NotificationsBell: React.FC<{ buttonClassName: string }> = ({ buttonClassName }) => {
  const t = useT();
  const s = t.notifications;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const { data, isError } = useNotifications();
  const unread = data?.unread_count ?? 0;

  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api.markNotificationsRead(ids),
    onSuccess: (fresh: Notifications) => queryClient.setQueryData(queryKeys.notifications, fresh),
  });

  // Close on a click outside or on Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n: AppNotification) => {
    if (!n.read) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? s.labelUnread(unread) : s.title}
        title={s.title}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={`${buttonClassName} relative`}
      >
        <BellIcon size={20} />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-1.5 end-1.5 min-w-5 h-5 px-1 inline-flex items-center justify-center rounded-full bg-btn-brand text-fg-on-brand text-xs font-semibold num"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={s.title}
          className="fixed inset-x-4 top-14 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-g4 z-dropdown rounded-md border border-line-subtle bg-surface-1 shadow-md overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 h-12 border-b border-line-subtle">
            <p className="m-0 text-body font-semibold text-fg">{s.title}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead.mutate(undefined)}
                className="text-sm font-medium text-fg-link hover:text-fg-link-hover"
              >
                {s.markAll}
              </button>
            )}
          </div>

          <div className="max-h-g4 overflow-y-auto">
            {isError ? (
              <p className="m-0 px-4 py-5 text-sm text-fg-muted">{s.failed}</p>
            ) : !data || data.items.length === 0 ? (
              <p className="m-0 px-4 py-5 text-sm text-fg-muted">{s.empty}</p>
            ) : (
              <ul className="m-0 p-0 list-none divide-y divide-line-subtle">
                {data.items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => openItem(n)}
                      className={`w-full text-start px-4 py-3 flex gap-3 hover:bg-state-hover ${n.read ? '' : 'bg-state-selected'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-2 size-2 shrink-0 rounded-2xs ${n.read ? 'bg-transparent' : 'bg-line-focus'}`}
                      />
                      <span className="flex-1 min-w-0 flex flex-col gap-1">
                        <span className={`text-body text-fg ${n.read ? 'font-medium' : 'font-semibold'}`}>
                          {n.title}
                        </span>
                        <span className="text-sm text-fg-muted">{n.body}</span>
                        <span className="text-xs text-fg-subtle">{fmtRelativeTime(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
