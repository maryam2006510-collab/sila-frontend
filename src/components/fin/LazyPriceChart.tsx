// src/components/fin/LazyPriceChart.tsx
// PriceChart as its own late chunk (D35): lightweight-charts (~170 KB) is downloaded and parsed
// only when the chart comes near the screen, never as part of a page's first load. Until then an
// empty box of the same size holds the place, so nothing shifts when the chart arrives.

import React, { Suspense, useRef } from 'react';
import { useInViewOnce } from '@/lib/hooks';
import type { PriceChartProps } from './PriceChart';

const PriceChart = React.lazy(() => import('./PriceChart').then((m) => ({ default: m.PriceChart })));

export const LazyPriceChart: React.FC<PriceChartProps> = (props) => {
  const ref = useRef<HTMLDivElement>(null);
  const near = useInViewOnce(ref, { rootMargin: '300px 0px' });
  const placeholder = (
    <div
      ref={ref}
      className={`w-full ${props.height ? '' : 'h-full'}`}
      style={props.height ? { height: props.height } : undefined}
      aria-hidden="true"
    />
  );
  return near ? (
    <Suspense fallback={placeholder}>
      <PriceChart {...props} />
    </Suspense>
  ) : (
    placeholder
  );
};
