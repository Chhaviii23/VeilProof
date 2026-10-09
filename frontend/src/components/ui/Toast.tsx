import { useApp } from '../../store/AppContext';
import type { ToastMessage } from '../../types';

const icons: Record<ToastMessage['type'], React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 2L14 13H2L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8 6v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const styles: Record<ToastMessage['type'], string> = {
  success: 'bg-success-bg text-success border-success',
  error: 'bg-error-bg text-error border-error',
  warning: 'bg-warning-bg text-warning border-warning',
  info: 'bg-info-bg text-info border-info',
};

import React from 'react';

export function ToastContainer() {
  const { state, dispatch } = useApp();

  return (
    <div
      className="fixed bottom-6 right-4 left-4 sm:left-auto sm:w-[360px] z-50 flex flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {state.toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-[8px] border shadow-sm ${styles[t.type]}`}
        >
          {icons[t.type]}
          <p className="text-[14px] flex-1 leading-snug">{t.message}</p>
          <button
            onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: t.id })}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
