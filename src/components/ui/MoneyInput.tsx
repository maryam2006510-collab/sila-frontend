// src/components/ui/MoneyInput.tsx
// Financial & Gram Weight Input with Auto-Formatting per 06-visual-style-fintech.md §5.2
// LTR digits, live thousands separators, fixed unit suffix, inputMode="decimal".

import React, { useId, useState } from 'react';
import { FieldMessage } from './Input';
import { fieldStateClasses } from './fieldStyles';
import { fmtNumber } from '@/lib/formatters';
import { useDirection } from '@/lib/direction';

interface MoneyInputProps {
  label?: string;
  value: number | string;
  onChangeValue: (val: number) => void;
  unit?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  isXL?: boolean;
  suggestions?: number[];
  // Optional label override per suggestion chip (e.g. "الكمية كاملة")
  suggestionLabel?: (value: number) => string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Keeps what the user typed (including a trailing "." or "0") while showing grouping
const formatTyped = (raw: string): string => {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const grouped = intPart ? new Intl.NumberFormat('en-US').format(Number(intPart)) : '0';
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
};

const toRaw = (v: number | string): string => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return n && Number.isFinite(n) ? String(n) : '';
};

export const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  value,
  onChangeValue,
  unit = 'د.ع',
  placeholder = '0',
  error,
  helperText,
  isXL = false,
  suggestions,
  suggestionLabel,
  className = '',
}) => {
  const id = useId();
  const isRtl = useDirection() === 'rtl';
  const [raw, setRaw] = useState(() => toRaw(value));
  const [syncedValue, setSyncedValue] = useState(value);

  // Adopt external changes (chips, clamping) during render, without clobbering an
  // in-progress edit such as "12." whose number already equals the new value
  if (value !== syncedValue) {
    setSyncedValue(value);
    const numeric = typeof value === 'string' ? parseFloat(value) || 0 : value;
    if (parseFloat(raw || '0') !== numeric) setRaw(toRaw(value));
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    setRaw(cleaned);
    const parsed = parseFloat(cleaned);
    onChangeValue(Number.isNaN(parsed) ? 0 : parsed);
  };

  return (
    <div className={`flex flex-col gap-2 w-full text-start ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-fg-muted select-none">
          {label}
        </label>
      )}

      {/* The field is always LTR (digits). In RTL the digits sit at the label edge
          (right) and the unit on the left; in LTR it mirrors (02-typography §6). */}
      <div className="relative flex items-center" dir="ltr">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          dir="ltr"
          autoComplete="off"
          placeholder={placeholder}
          value={formatTyped(raw)}
          onChange={handleInputChange}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`num w-full rounded-sm bg-sunken text-fg font-semibold placeholder:text-fg-placeholder border outline-none transition-control dur-2 ease-standard ${
            isRtl ? 'text-end ps-16 pe-4' : 'text-start ps-4 pe-16'
          } ${isXL ? 'h-16 text-h3' : 'h-control-lg text-label'} ${fieldStateClasses(error)}`}
        />

        {/* Positioned inside the LTR box: start = left, end = right */}
        <span
          className={`absolute ${isRtl ? 'start-4' : 'end-4'} font-medium text-fg-subtle select-none pointer-events-none ${
            isXL ? 'text-h4' : 'text-sm'
          }`}
        >
          {unit}
        </span>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              onClick={() => onChangeValue(sug)}
              className="h-control-sm px-3 rounded-xs bg-muted border border-line-subtle text-sm font-medium text-fg-muted hover:border-line-strong hover:text-fg active:scale-98 transition-control dur-2 ease-standard outline-none focus-visible:ring-3 focus-visible:ring-line-focus/35"
            >
              {suggestionLabel ? (
                suggestionLabel(sug)
              ) : (
                <>
                  <bdi className="num">{fmtNumber(sug)}</bdi> {unit}
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <FieldMessage id={id} error={error} helperText={helperText} />
    </div>
  );
};
