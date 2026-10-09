import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, useInvestigator } from '../../store/AppContext';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import type { DemoRole } from '../../types';
import { DEMO_INVESTIGATORS } from '../../services/fixtures';

const ROLE_LABELS: Record<DemoRole, string> = {
  reporter: 'Reporter view',
  'case-investigator': 'Arjun Mehta (Anti-Corruption Officer · ACO-04)',
  'privacy-officer': 'Priya Nair (Privacy & Evidence Officer)',
  'oversight-officer': 'Meera Rao (Oversight & Whistleblower Protection)',
};

const ROLE_ORDER: DemoRole[] = ['reporter', 'case-investigator', 'privacy-officer', 'oversight-officer'];

const ROLE_TO_INV_ID: Record<DemoRole, string | null> = {
  reporter: null,
  'case-investigator': 'arjun',
  'privacy-officer': 'priya',
  'oversight-officer': 'meera',
};

const ROLE_DEST: Record<DemoRole, string> = {
  reporter: '/',
  'case-investigator': '/investigator/cases',
  'privacy-officer': '/privacy-officer/queue',
  'oversight-officer': '/oversight/approvals',
};

interface DemoRoleSwitcherProps {
  compact?: boolean;
}

export function DemoRoleSwitcher({ compact }: DemoRoleSwitcherProps) {
  const { state, dispatch, toast } = useApp();
  const { setSession, clearSession } = useInvestigator();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentRole = state.demoRole;
  const hasReceipt = !!state.receipt;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function switchRole(role: DemoRole) {
    setOpen(false);
    if (role === currentRole) return;

    dispatch({ type: 'SET_DEMO_ROLE', payload: role });

    if (role === 'reporter') {
      clearSession();
      navigate(hasReceipt ? '/report/receipt' : '/');
      toast('info', 'Reporter view. Draft and receipts preserved.');
    } else {
      const invId = ROLE_TO_INV_ID[role];
      const inv = invId ? DEMO_INVESTIGATORS.find((i) => i.id === invId) : null;
      if (inv) {
        setSession({ investigator: inv, signedInAt: new Date().toISOString() });
        navigate(ROLE_DEST[role]);
        toast('info', `Switched to ${inv.name} — ${inv.role}.`);
      }
    }
  }

  function handleReset() {
    setOpen(false);
    setConfirmReset(true);
  }

  function confirmResetDemo() {
    dispatch({ type: 'RESET_DEMO' });
    dispatch({ type: 'SET_DEMO_ROLE', payload: 'reporter' });
    clearSession();
    navigate('/');
    toast('success', 'Demo reset. Initial cases restored.');
    setConfirmReset(false);
  }

  if (compact) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-rule text-[12px] font-medium text-ink-2 hover:bg-surface-hover transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden />
          <span>Demo</span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-rule rounded-[8px] shadow-md z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-rule">
              <p className="text-[11px] font-medium text-ink-muted uppercase tracking-wide">Demo role switch</p>
            </div>
            <div className="p-1">
              {ROLE_ORDER.map((role) => (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  className={`w-full text-left px-3 py-2 rounded-[6px] text-[13px] transition-colors flex items-center gap-2 ${
                    currentRole === role
                      ? 'bg-ember-soft text-ember font-medium'
                      : 'text-ink-1 hover:bg-surface-hover'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentRole === role ? 'bg-ember' : 'bg-transparent'}`} aria-hidden />
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            <div className="p-1 border-t border-rule">
              <button
                onClick={handleReset}
                className="w-full text-left px-3 py-2 rounded-[6px] text-[13px] text-error hover:bg-error-bg transition-colors"
              >
                Reset demo
              </button>
            </div>
          </div>
        )}

        <ConfirmationDialog
          open={confirmReset}
          title="Reset demo?"
          description="All submitted complaints, approvals and status updates will be removed. Initial sample cases will be restored."
          confirmLabel="Reset demo"
          variant="danger"
          onConfirm={confirmResetDemo}
          onCancel={() => setConfirmReset(false)}
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-rule text-[12px] font-medium text-ink-2 hover:bg-surface-hover transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden />
        Demo controls
      </button>

      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-ink-1/20" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-[16px] p-4 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-rule rounded-full mx-auto mb-4" />
            <div className="mb-4">
              <p className="text-[13px] font-semibold text-ink-1">Demo role switch</p>
              <p className="text-[11px] text-ink-muted">Changes last until this page is refreshed.</p>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              {ROLE_ORDER.map((role) => (
                <button
                  key={role}
                  onClick={() => switchRole(role)}
                  className={`text-left px-4 py-3 rounded-[8px] text-[14px] transition-colors flex items-center gap-3 ${
                    currentRole === role
                      ? 'bg-ember-soft text-ember font-medium'
                      : 'text-ink-1 hover:bg-surface-hover'
                  }`}
                >
                  {currentRole === role ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-rule-strong shrink-0" />
                  )}
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
            <button
              onClick={handleReset}
              className="w-full text-left px-4 py-3 rounded-[8px] text-[14px] text-error hover:bg-error-bg transition-colors"
            >
              Reset demo
            </button>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmReset}
        title="Reset demo?"
        description="All submitted complaints, approvals and updates will be removed. Initial sample cases will be restored."
        confirmLabel="Reset demo"
        variant="danger"
        onConfirm={confirmResetDemo}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
