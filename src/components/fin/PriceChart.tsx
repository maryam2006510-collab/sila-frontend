// src/components/fin/PriceChart.tsx
// TradingView Lightweight Charts (v5) area chart per UI Kit 06-visual-style-fintech.md §7
// Colors are read from CSS tokens (no hex here). Time runs left to right in both locales.

import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries, ColorType, LineStyle, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { useThemeStore } from '@/app/theme';
import { fmtDateTime, fmtIQD } from '@/lib/formatters';
import { useT } from '@/i18n';

export interface PricePoint {
  // Unix seconds (UTC)
  time: number;
  value: number;
}

interface PriceChartProps {
  data: PricePoint[];
  // Fixed height in px; omit to fill the parent (parent must have a definite height)
  height?: number;
  // Plain-language summary for screen readers (06-style §7.3)
  ariaLabel: string;
  // Axis / table formatter, IQD by default
  formatValue?: (v: number) => string;
  // Small embeds (the live price card): no price axis, since the headline price sits above
  // and a short axis clips its top label and collides with the last-value tag
  compact?: boolean;
  className?: string;
}

const readToken = (el: HTMLElement, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  height,
  ariaLabel,
  formatValue = fmtIQD,
  compact = false,
  className = '',
}) => {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const theme = useThemeStore((s) => s.theme);

  // Create once per theme; data updates go through setData (no remount per tick)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const line = readToken(el, '--chart-gold-line');
    const area = readToken(el, '--chart-gold-area');
    const grid = readToken(el, '--chart-grid');
    const axis = readToken(el, '--chart-axis');
    const crosshair = readToken(el, '--chart-crosshair');

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: axis,
        fontFamily: readToken(el, '--font-num'),
        fontSize: 13,
      },
      // Horizontal grid only, no chart border box (06-style §7.2)
      grid: {
        vertLines: { visible: false },
        horzLines: { color: grid, style: LineStyle.Solid },
      },
      rightPriceScale: { visible: !compact, borderVisible: false, scaleMargins: { top: 0.15, bottom: 0.1 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true, timeVisible: true },
      crosshair: {
        vertLine: { color: crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: crosshair },
        horzLine: { color: crosshair, width: 1, style: LineStyle.Dashed, labelBackgroundColor: crosshair },
      },
      // Arabic dates on the crosshair label, Western digits (06-style §7)
      localization: { priceFormatter: formatValue, timeFormatter: (time: number) => fmtDateTime(time * 1000) },
      handleScale: false,
      handleScroll: false,
    });

    // Flat single-alpha fill: top and bottom are the same color (no gradient)
    seriesRef.current = chart.addSeries(AreaSeries, {
      lineColor: line,
      topColor: area,
      bottomColor: area,
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
      crosshairMarkerRadius: 4,
    });
    chartRef.current = chart;

    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height, theme, compact]);

  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    const sorted = [...data].sort((a, b) => a.time - b.time);
    seriesRef.current.setData(sorted.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
    chartRef.current.timeScale().fitContent();
  }, [data, theme]);

  return (
    <figure className={`relative w-full m-0 ${height ? '' : 'h-full'} ${className}`} dir="ltr">
      <div
        ref={containerRef}
        className={`w-full ${height ? '' : 'h-full'}`}
        style={height ? { height } : undefined}
        role="img"
        aria-label={ariaLabel}
      />

      {/* Screen reader alternative for the visible range (06-style §7.3) */}
      {/* sr-only sits on a wrapper: on a <table> the clip does not hide the caption */}
      <div className="sr-only">
        <table>
          <caption>{t.market.chartTableCaption}</caption>
          <thead>
            <tr>
              <th scope="col">{t.market.chartDate}</th>
              <th scope="col">{t.market.chartPrice}</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(-5).map((point) => (
              <tr key={point.time}>
                <td>{fmtDateTime(point.time * 1000)}</td>
                <td>{formatValue(point.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
