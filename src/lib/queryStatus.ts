// src/lib/queryStatus.ts
// Folds the queries a figure depends on into one display status (error wins over loading).
// A value that did not arrive is never shown as 0 (see KpiCard).

export type DataStatus = 'ready' | 'loading' | 'error';

export const dataStatus = (...queries: { isPending: boolean; isError: boolean }[]): DataStatus =>
  queries.some((q) => q.isError) ? 'error' : queries.some((q) => q.isPending) ? 'loading' : 'ready';
