import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', description = 'An error occurred. Please try again.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="text-error">
        <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="1.5" />
        <path d="M20 13v9M20 26h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-[16px] font-medium text-ink-1">{title}</p>
        <p className="text-[14px] text-ink-2 mt-1 max-w-sm mx-auto">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
