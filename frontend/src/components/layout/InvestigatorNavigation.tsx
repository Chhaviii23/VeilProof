import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { VeilProofLogo } from './AppHeader';
import { useInvestigator } from '../../store/AppContext';
import type { StaffRoleType } from '../../types';

interface NavItem { to: string; label: string; icon: React.ReactNode; }

const CasesIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M6 3V1h6v2M4 8h10M4 11h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
const ShieldIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L3 4.5V9c0 3.5 2.5 6.5 6 7.5 3.5-1 6-4 6-7.5V4.5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const CheckCircleIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" /><path d="M6 9l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const CloseBoxIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.4" /><path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;
const AccountIcon = () => <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="6" r="4" stroke="currentColor" strokeWidth="1.4" /><path d="M2 16c0-3.314 3.134-6 7-6s7 2.686 7 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>;

function navItemsForRole(roleType: StaffRoleType): NavItem[] {
  if (roleType === 'case-investigator') return [
    { to: '/investigator/cases', label: 'Cases', icon: <CasesIcon /> },
    { to: '/investigator/account', label: 'Account', icon: <AccountIcon /> },
  ];
  if (roleType === 'privacy-officer') return [
    { to: '/privacy-officer/queue', label: 'Evidence queue', icon: <ShieldIcon /> },
    { to: '/investigator/account', label: 'Account', icon: <AccountIcon /> },
  ];
  if (roleType === 'oversight-officer') return [
    { to: '/oversight/approvals', label: 'Access approvals', icon: <CheckCircleIcon /> },
    { to: '/oversight/closures', label: 'Closures', icon: <CloseBoxIcon /> },
    { to: '/investigator/account', label: 'Account', icon: <AccountIcon /> },
  ];
  return [];
}

export function InvestigatorSidebar({ pageTitle }: { pageTitle?: string }) {
  const { session, clearSession } = useInvestigator();
  const navigate = useNavigate();

  function handleSignOut() { clearSession(); navigate('/investigator/sign-in'); }

  const roleType = session?.investigator.roleType ?? 'case-investigator';
  const navItems = navItemsForRole(roleType);
  const roleLabel = roleType === 'case-investigator' ? 'Anti-Corruption Officer' : roleType === 'privacy-officer' ? 'Privacy & Evidence Officer' : 'Oversight & Whistleblower Protection Officer';

  return (
    <>
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-surface border-r border-rule min-h-screen sticky top-0">
        <div className="h-14 flex items-center px-4 border-b border-rule">
          <Link to="/" className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 rounded-sm"><VeilProofLogo /></Link>
        </div>
        {session && (
          <div className="px-4 py-2.5 border-b border-rule bg-surface-2">
            <p className="text-[10px] text-ink-muted uppercase tracking-wide font-semibold">{roleLabel}</p>
          </div>
        )}
        <nav className="flex-1 p-3 flex flex-col gap-1" aria-label="Staff navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-[14px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 ${isActive ? 'bg-surface-2 text-ink-1 border-l-2 border-ember -ml-px pl-[11px]' : 'text-ink-2 hover:bg-surface-hover hover:text-ink-1'}`}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-rule">
          {session && <div className="mb-3"><p className="text-[13px] font-medium text-ink-1">{session.investigator.name}</p><p className="text-[11px] text-ink-muted">{session.investigator.organization}</p></div>}
          <button onClick={handleSignOut} className="text-[13px] text-ink-muted hover:text-ink-1 transition-colors">Sign out</button>
        </div>
      </aside>
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule z-20 lg:hidden" aria-label="Staff mobile navigation">
        <div className="flex">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex-1 flex flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:bg-surface-hover ${isActive ? 'text-ember' : 'text-ink-muted hover:text-ink-1'}`}>
              {({ isActive }) => (<><span className={isActive ? 'text-ember' : ''}>{item.icon}</span><span>{item.label}</span>{isActive && <span className="w-1 h-1 rounded-full bg-ember" aria-hidden />}</>)}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
