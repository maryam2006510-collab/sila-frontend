// src/components/ui/LoadingSquares.tsx
// Three of the logo's squares pulsing in sequence (06-style §5.1): the one loading motif,
// small inside buttons and larger on full-screen loads.

import React from 'react';

export const LoadingSquares: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({
  size = 'sm',
  className = '',
}) => (
  <span className={`inline-flex items-center ${size === 'sm' ? 'gap-1' : 'gap-2'} ${className}`} aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className={`${size === 'sm' ? 'size-1.5' : 'size-2'} rounded-2xs bg-current loading-square`}
        style={{ animationDelay: `calc(var(--dur-3) * ${i})` }}
      />
    ))}
  </span>
);
