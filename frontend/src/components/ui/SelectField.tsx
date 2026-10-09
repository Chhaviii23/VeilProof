import { useId } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function SelectField({ label, value, onChange, onBlur, options, placeholder, error, hint, required, disabled, className = '' }: SelectFieldProps) {
  const id = useId();
  const borderClass = error
    ? 'border-error'
    : 'border-rule-strong hover:border-neutral-strong';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-medium text-ink-1">
        {label}
        {required && <span className="text-ember ml-0.5" aria-hidden>*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`w-full appearance-none bg-surface border ${borderClass} rounded-[8px] px-3 py-3 text-[16px] min-h-[48px] font-sans text-ink-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 disabled:bg-disabled-bg disabled:text-disabled disabled:cursor-not-allowed pr-10`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-2"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-[13px] text-ink-muted">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-[13px] text-error flex items-center gap-1" role="alert">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
