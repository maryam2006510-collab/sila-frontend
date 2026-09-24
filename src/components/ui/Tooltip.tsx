// src/components/ui/Tooltip.tsx
// Tooltip per UI Kit 06-visual-style-fintech.md §5.6: surface-3, radius 5, 14px, max 280, 400ms delay.
// Centered with a physical translate, which is direction-safe (the centre is the same in RTL/LTR).

import React, { useId, useRef, useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 400, className = '' }) => {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setIsVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsVisible(false);
  };

  return (
    <span
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => e.key === 'Escape' && hide()}
      aria-describedby={isVisible ? id : undefined}
    >
      {children}

      {isVisible && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-tooltip w-max max-w-70 px-3 py-2 rounded-xs bg-surface-3 border border-line-strong text-fg text-sm font-normal shadow-md pointer-events-none text-start"
        >
          {content}
        </span>
      )}
    </span>
  );
};
