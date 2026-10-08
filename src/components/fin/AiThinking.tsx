// src/components/fin/AiThinking.tsx
// AI "thinking": three logo squares pulsing in sequence + an honest status line (07-motion #15),
// over skeletons of the result layout. Shared by Smart Match and the AI Advisor.

import React from 'react';

interface AiThinkingProps {
  label: string;
  // Skeleton rows standing in for the results (0 = the status line only)
  rows?: number;
}

export const AiThinking: React.FC<AiThinkingProps> = ({ label, rows = 3 }) => (
  <div className="flex flex-col gap-5" aria-busy="true">
    <p role="status" className="m-0 flex items-center gap-3 text-body text-fg-muted">
      <span className="inline-flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 rounded-2xs bg-line-focus loading-square"
            style={{ animationDelay: `calc(var(--dur-3) * ${i})` }}
          />
        ))}
      </span>
      {label}
    </p>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="h-g3 rounded-md skeleton-loading" aria-hidden="true" />
    ))}
  </div>
);
