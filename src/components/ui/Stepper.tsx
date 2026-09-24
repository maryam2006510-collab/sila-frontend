// src/components/ui/Stepper.tsx
// Sila Cut Progress Indicator per UI Kit 06-visual-style-fintech.md §5.8
// Segments 4px tall, gap 4. Done = selected indicator, current = signal blue, upcoming = border.

import React from 'react';

export interface StepItem {
  id: string;
  label: string;
}

interface StepperProps {
  steps: StepItem[];
  // Index of the current step; steps.length marks everything as done
  currentStepIndex: number;
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStepIndex, className = '' }) => {
  const current = steps[Math.min(currentStepIndex, steps.length - 1)];

  return (
    <div className={`flex flex-col gap-2 w-full select-none ${className}`}>
      <div
        className="flex items-center gap-1 w-full"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={steps.length}
        aria-valuenow={Math.min(currentStepIndex + 1, steps.length)}
        aria-valuetext={current?.label}
      >
        {steps.map((step, idx) => {
          const tone =
            idx < currentStepIndex ? 'bg-state-indicator' : idx === currentStepIndex ? 'bg-line-focus' : 'bg-line';
          return <div key={step.id} className={`h-1 flex-1 sila-cut transition-colors dur-4 ease-standard ${tone}`} />;
        })}
      </div>

      {/* Step names are verbs, never "Step 1" */}
      <ol className="flex items-start justify-between gap-2 text-sm m-0 p-0 list-none">
        {steps.map((step, idx) => (
          <li
            key={step.id}
            aria-current={idx === currentStepIndex ? 'step' : undefined}
            className={`flex-1 text-start transition-colors dur-3 ease-standard ${
              idx === currentStepIndex
                ? 'text-fg font-semibold'
                : idx < currentStepIndex
                  ? 'text-fg-muted font-medium'
                  : 'text-fg-subtle font-medium'
            }`}
          >
            {step.label}
          </li>
        ))}
      </ol>
    </div>
  );
};
