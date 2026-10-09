interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

import React from 'react';

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center">
      {icon && <div className="text-ink-muted">{icon}</div>}
      <div>
        <p className="text-[16px] font-medium text-ink-1">{title}</p>
        {description && <p className="text-[14px] text-ink-2 mt-1 max-w-sm mx-auto">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function InboxIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="5" y="8" width="30" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 22h8l3 4h8l3-4h8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="18" cy="18" r="11" stroke="currentColor" strokeWidth="1.5" />
      <path d="M26 26l7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
