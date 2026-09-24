// src/components/ui/Table.tsx
// Financial Table per UI Kit 04-layout §5 & 06-visual-style-fintech.md §5.5
// Rows 56, sticky 44 header, bottom borders only, numbers end-aligned.

import React from 'react';
import { useT } from '@/i18n';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  loading?: boolean;
  caption?: string;
}

const alignClass = { start: 'text-start', center: 'text-center', end: 'text-end' } as const;

export function Table<T>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  emptyMessage,
  loading = false,
  caption,
}: TableProps<T>) {
  const t = useT();

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-2 p-4" aria-busy="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 w-full rounded-sm skeleton-loading" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="w-full py-12 px-4 text-center text-fg-subtle text-body">{emptyMessage ?? t.common.noData}</div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="h-11 bg-muted border-b border-line-subtle">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`sticky top-0 z-sticky bg-muted px-4 text-sm font-medium text-fg-muted whitespace-nowrap ${
                  alignClass[col.align ?? 'start']
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onRowClick(row);
                      }
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              className={`h-14 border-b border-line-subtle transition-colors dur-2 ease-standard ${
                onRowClick
                  ? 'cursor-pointer hover:bg-state-hover active:bg-state-pressed outline-none focus-visible:bg-state-hover'
                  : ''
              }`}
            >
              {columns.map((col) => {
                const value = (row as Record<string, unknown>)[col.key];
                return (
                  <td
                    key={col.key}
                    className={`px-4 text-body text-fg whitespace-nowrap ${alignClass[col.align ?? 'start']}`}
                  >
                    {col.render ? col.render(row) : String(value ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
