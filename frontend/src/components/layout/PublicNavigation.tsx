import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8 20v-8h6v8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/track',
    label: 'Track',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 7v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: '/verify',
    label: 'Verify',
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 2l2.4 7.2H21l-6.2 4.5 2.4 7.3L11 17l-6.2 4 2.4-7.3L1 9.2h7.6L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function PublicBottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule z-20 md:hidden safe-area-inset-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:bg-surface-hover ${
                isActive ? 'text-ember' : 'text-ink-muted hover:text-ink-1'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-ember' : ''}>{item.icon}</span>
                <span>{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full bg-ember" aria-hidden />}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
