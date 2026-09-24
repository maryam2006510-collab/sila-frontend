// src/components/ui/Input.tsx
// Core Form Input Component per UI Kit 06-visual-style-fintech.md §5.2

import React, { useId } from 'react';
import { WarningOctagonIcon } from '@phosphor-icons/react';
import { fieldStateClasses } from './fieldStyles';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  suffix?: string;
}

// Shared by Input and MoneyInput so both fields read identically
export const FieldMessage: React.FC<{ id: string; error?: string; helperText?: string }> = ({
  id,
  error,
  helperText,
}) =>
  error ? (
    <p id={`${id}-error`} className="text-sm font-medium text-danger-fg flex items-center gap-2 m-0">
      <WarningOctagonIcon size={16} weight="fill" aria-hidden="true" className="shrink-0" />
      <span>{error}</span>
    </p>
  ) : helperText ? (
    <p id={`${id}-helper`} className="text-sm text-fg-subtle m-0">
      {helperText}
    </p>
  ) : null;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, startIcon, endIcon, suffix, className = '', id, readOnly, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;

    return (
      <div className="flex flex-col gap-2 w-full text-start">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-fg-muted select-none">
            {label}
          </label>
        )}

        {/* The adornments follow the field's own direction: an LTR value (email, password) keeps
            its icon on the same side as the padding reserved for it */}
        <div className="relative flex items-center" dir={props.dir}>
          {startIcon && (
            <span className="absolute start-3 text-fg-subtle pointer-events-none flex items-center">{startIcon}</span>
          )}

          <input
            ref={ref}
            id={inputId}
            readOnly={readOnly}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            className={`w-full h-control-lg rounded-sm text-fg text-label font-medium placeholder:text-fg-placeholder border outline-none transition-control dur-2 ease-standard ${
              readOnly ? 'bg-muted border-line-subtle' : `bg-sunken ${fieldStateClasses(error)}`
            } ${startIcon ? 'ps-10' : 'ps-4'} ${endIcon || suffix ? 'pe-12' : 'pe-4'} ${className}`}
            {...props}
          />

          {suffix && (
            <span className="absolute end-4 text-sm font-medium text-fg-subtle select-none pointer-events-none">
              {suffix}
            </span>
          )}

          {endIcon && !suffix && <span className="absolute end-3 text-fg-subtle flex items-center">{endIcon}</span>}
        </div>

        <FieldMessage id={inputId} error={error} helperText={helperText} />
      </div>
    );
  }
);

Input.displayName = 'Input';
