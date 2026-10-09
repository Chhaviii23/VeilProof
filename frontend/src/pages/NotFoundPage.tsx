import React from 'react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-5 text-center">
      <p className="text-[64px] font-semibold text-rule leading-none mb-4">404</p>
      <h1 className="text-[22px] font-semibold text-ink-1 mb-2">Page not found</h1>
      <p className="text-[15px] text-ink-2 mb-8 max-w-[360px] leading-relaxed">
        The page you're looking for doesn't exist or has moved.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-4 py-2.5 bg-ember text-white rounded-[8px] text-[14px] font-semibold hover:bg-ember-press transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
        >
          Go home
        </Link>
        <Link
          to="/track"
          className="px-4 py-2.5 border border-rule-strong text-ink-1 rounded-[8px] text-[14px] font-medium hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
        >
          Track a report
        </Link>
      </div>
    </main>
  );
}
