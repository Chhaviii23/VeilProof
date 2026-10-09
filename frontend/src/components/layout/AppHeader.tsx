import React from 'react';
import { Link } from 'react-router-dom';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';

interface AppHeaderProps {
  showInvestigatorLink?: boolean;
  investigatorName?: string;
  pageTitle?: string;
}

export function VeilProofLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="1" y="1" width="20" height="20" rx="4" stroke="#B94725" strokeWidth="1.8" />
        <path d="M6 7l5 8 5-8" stroke="#B94725" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 7h6" stroke="#B94725" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="text-[17px] font-semibold text-ink-1 tracking-tight">VeilProof</span>
    </div>
  );
}

export function AppHeader({ showInvestigatorLink = true, investigatorName, pageTitle }: AppHeaderProps) {
  return (
    <header className="bg-surface border-b border-rule sticky top-0 z-30">
      <div className="max-w-[1200px] mx-auto px-5 lg:px-8 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 rounded-sm shrink-0">
          <VeilProofLogo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main navigation">
          <NavLink to="/report/details">Start a report</NavLink>
          <NavLink to="/track">Track</NavLink>
          <NavLink to="/verify">Verify</NavLink>
          <NavLink to="/safety">Safety</NavLink>
          {showInvestigatorLink && !investigatorName && (
            <NavLink to="/investigator/sign-in" subdued>Investigator sign in</NavLink>
          )}
          {investigatorName && (
            <span className="text-[13px] text-ink-muted ml-2">{investigatorName}</span>
          )}
        </nav>

        {/* Demo switcher — desktop */}
        <div className="hidden md:block">
          <DemoRoleSwitcher compact />
        </div>

        {/* Mobile: page title or CTA + demo */}
        <div className="md:hidden flex items-center gap-2">
          {pageTitle ? (
            <p className="text-[14px] font-medium text-ink-2">{pageTitle}</p>
          ) : (
            <Link
              to="/report/details"
              className="text-[13px] font-semibold text-ember hover:text-ember-press transition-colors"
            >
              Start a report
            </Link>
          )}
          <DemoRoleSwitcher />
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children, subdued }: { to: string; children: React.ReactNode; subdued?: boolean }) {
  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 hover:bg-surface-hover ${
        subdued ? 'text-ink-muted hover:text-ink-1' : 'text-ink-1'
      }`}
    >
      {children}
    </Link>
  );
}
