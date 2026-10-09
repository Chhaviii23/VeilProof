import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-sans font-semibold rounded-[8px] border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 disabled:cursor-not-allowed select-none';

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-4 py-3 text-[15px] min-h-[48px]',
    lg: 'px-6 py-3.5 text-base min-h-[52px]',
  };

  const variants = {
    primary: 'bg-ember text-white border-ember hover:bg-ember-press active:bg-ember-press disabled:bg-disabled-bg disabled:text-disabled disabled:border-disabled-bg',
    secondary: 'bg-surface text-ink-1 border-rule-strong hover:bg-surface-hover active:bg-surface-hover disabled:bg-disabled-bg disabled:text-disabled disabled:border-rule',
    tertiary: 'bg-transparent text-ink-1 border-transparent hover:bg-surface-hover active:bg-surface-hover disabled:text-disabled',
    danger: 'bg-surface text-error border-error hover:bg-error-bg active:bg-error-bg disabled:bg-disabled-bg disabled:text-disabled disabled:border-rule',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
