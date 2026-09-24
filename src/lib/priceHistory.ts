// src/lib/priceHistory.ts
// Chart ranges of GET /api/market/prices/history (contract §4 Market Data).
// Server buckets: 1D = 10 min · 1W = 1 h · 1M = 4 h · 3M = 12 h · 1Y = 1 day.

import type { ChartRange } from './types';

export type { ChartRange };

export const CHART_RANGES: { value: ChartRange }[] = [
  { value: '1D' },
  { value: '1W' },
  { value: '1M' },
  { value: '3M' },
  { value: '1Y' },
];
