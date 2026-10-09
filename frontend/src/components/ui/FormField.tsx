import React, { useId } from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface InputProps extends Omit<FormFieldProps, 'children'> {
  type?: 'text' | 'date' | 'textarea';
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  rows?: number;
  disabled?: boolean;
}

const inputClass =
  'w-full bg-surface border rounded-[8px] px-3 py-3 text-[16px] text-ink-1 placeholder-ink-muted min-h-[48px] font-sans transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 disabled:bg-disabled-bg disabled:text-disabled disabled:cursor-not-allowed';

const errorBorder = 'border-error';
const normalBorder = 'border-rule-strong hover:border-neutral-strong';

export function FormField({ label, error, hint, required, children, className = '' }: FormFieldProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-medium text-ink-1">
        {label}
        {required && <span className="text-ember ml-0.5" aria-hidden>*</span>}
      </label>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id }) : child
      )}
      {hint && !error && <p className="text-[13px] text-ink-muted">{hint}</p>}
      {error && (
        <p className="text-[13px] text-error flex items-center gap-1" role="alert">
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

export function TextInput({ label, error, hint, required, type = 'text', value, onChange, onBlur, placeholder, maxLength, minLength, rows = 4, disabled, className = '' }: InputProps) {
  const id = useId();
  const borderClass = error ? errorBorder : normalBorder;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-[14px] font-medium text-ink-1">
        {label}
        {required && <span className="text-ember ml-0.5" aria-hidden>*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={rows}
          disabled={disabled}
          className={`${inputClass} ${borderClass} resize-y min-h-[120px]`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          minLength={minLength}
          disabled={disabled}
          className={`${inputClass} ${borderClass}`}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
      )}
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
      {maxLength && type === 'textarea' && (
        <p className="text-[12px] text-ink-muted text-right tabular-nums">{value.length} / {maxLength}</p>
      )}
    </div>
  );
}
