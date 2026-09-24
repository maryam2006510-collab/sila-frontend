// src/components/fin/Sparkline.tsx
// Custom SVG sparkline per UI Kit 06-style §7 & §3.2: 1.5px monotone line, square end marker.
// Fills its container width; the stroke does not scale with the viewBox.

import React, { useMemo } from 'react';
import { scaleLinear } from 'd3-scale';
import { line as d3Line, curveMonotoneX } from 'd3-shape';

interface SparklineProps {
  data: number[];
  // Height in px (52 in listing cards, 04-layout §8.2)
  height?: number;
  // CSS color, defaults to the gold price series token
  color?: string;
  className?: string;
}

const VIEW_W = 280;
const PAD_X = 4;
const PAD_Y = 6;

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  height = 52,
  color = 'var(--chart-gold-line)',
  className = '',
}) => {
  const geometry = useMemo(() => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max === min ? 1 : max - min;

    const x = scaleLinear()
      .domain([0, data.length - 1])
      .range([PAD_X, VIEW_W - PAD_X]);
    const y = scaleLinear()
      .domain([min - range * 0.05, max + range * 0.05])
      .range([height - PAD_Y, PAD_Y]);

    const path = d3Line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(curveMonotoneX)(data);

    const last = data[data.length - 1];
    return { path: path ?? '', endX: x(data.length - 1) / VIEW_W, endY: y(last) };
  }, [data, height]);

  if (!geometry) {
    return <div className={`skeleton-loading rounded-xs w-full ${className}`} style={{ height }} aria-hidden="true" />;
  }

  return (
    <div className={`relative w-full ${className}`} style={{ height }} dir="ltr" aria-hidden="true">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        preserveAspectRatio="none"
        className="block"
      >
        <path
          d={geometry.path}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* End marker: 8×8 rounded square (logo square motif), kept undistorted in HTML */}
      <span
        className="absolute size-2 rounded-2xs -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${geometry.endX * 100}%`, top: geometry.endY, backgroundColor: color }}
      />
    </div>
  );
};
