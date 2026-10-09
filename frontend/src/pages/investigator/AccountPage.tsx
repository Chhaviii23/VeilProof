import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useInvestigator, useApp } from '../../store/AppContext';

export function AccountPage() {
  const { session, clearSession } = useInvestigator();
  const { toast } = useApp();
  const navigate = useNavigate();

  function handleSignOut() {
    clearSession();
    navigate('/investigator/sign-in');
    toast('success', 'Signed out successfully.');
  }

  if (!session) return null;

  const inv = session.investigator;
  const signedInDate = new Date(session.signedInAt).toLocaleString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col gap-6 max-w-[480px]">
      <h1 className="text-[26px] font-semibold text-ink-1">Account</h1>

      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-rule bg-surface-2">
          <h2 className="text-[15px] font-semibold text-ink-1">Current investigator</h2>
          <p className="text-[12px] text-ink-muted italic">Demo — fictional account</p>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Name</p>
            <p className="text-[16px] font-medium text-ink-1">{inv.name}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Organization</p>
            <p className="text-[15px] text-ink-1">{inv.organization}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Role</p>
            <p className="text-[15px] text-ink-1">{inv.role}</p>
          </div>
          <div>
            <p className="text-[12px] text-ink-muted mb-0.5">Session started</p>
            <p className="text-[14px] text-ink-2 tabular-nums">{signedInDate}</p>
          </div>
        </div>
      </div>

      <div className="border border-rule rounded-[12px] bg-surface p-5">
        <h2 className="text-[15px] font-semibold text-ink-1 mb-4">Demo controls</h2>
        <p className="text-[13px] text-ink-muted mb-4">
          To switch investigator accounts or reset demo data, visit the{' '}
          <a href="/demo" className="text-ember underline">demo control panel</a>.
        </p>
        <Button variant="danger" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  );
}
