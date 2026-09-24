// src/components/fin/AiInsight.tsx
// Explainable AI line per UI Kit 06-visual-style-fintech.md §6.3
// Sparkle is used here and nowhere else (03-icon §5.2). Failure never hides the flow.

import React from 'react';
import { SparkleIcon } from '@phosphor-icons/react';
import { useT } from '@/i18n';
import { isolateFigures } from '@/lib/bidi';

interface AiInsightProps {
  text?: string;
  // Plain-words source/confidence line
  source?: string;
  isUnavailable?: boolean;
  // The server's own wording when unavailable (e.g. preview's risk_insight_note)
  unavailableText?: string | null;
  className?: string;
}

export const AiInsight: React.FC<AiInsightProps> = ({
  text,
  source,
  isUnavailable = false,
  unavailableText,
  className = '',
}) => {
  const t = useT();

  return (
    <div className={`rounded-sm bg-muted py-3 px-4 flex items-start gap-3 text-start ${className}`}>
      <SparkleIcon size={16} weight="regular" className="shrink-0 mt-1.5 text-line-focus" aria-hidden="true" />

      {isUnavailable || !text ? (
        <p className="m-0 text-body text-fg-subtle">{unavailableText || t.ai.unavailable}</p>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="m-0 text-body text-fg-muted">{isolateFigures(text)}</p>
          <p className="m-0 text-sm text-fg-subtle">{source ?? t.ai.defaultSource}</p>
        </div>
      )}
    </div>
  );
};
