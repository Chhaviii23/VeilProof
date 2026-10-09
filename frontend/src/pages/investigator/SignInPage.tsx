import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TextInput } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useInvestigator } from '../../store/AppContext';
import { DEMO_INVESTIGATORS, DEMO_CREDENTIALS } from '../../services/fixtures';
import { VeilProofLogo } from '../../components/layout/AppHeader';

export function SignInPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setSession } = useInvestigator();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from ?? '/investigator/cases';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 300));
    const cred = DEMO_CREDENTIALS.find((c) => c.username === username.trim() && c.password === password);
    if (!cred) { setError('Sign in failed. Check your username and password.'); setLoading(false); return; }
    const inv = DEMO_INVESTIGATORS.find((i) => i.id === cred.investigatorId);
    if (!inv) { setError('Account not found.'); setLoading(false); return; }
    setSession({ investigator: inv, signedInAt: new Date().toISOString() });
    const destByRole: Record<string, string> = { 'case-investigator': '/investigator/cases', 'privacy-officer': '/privacy-officer/queue', 'oversight-officer': '/oversight/approvals' };
    navigate(destByRole[inv.roleType] ?? '/investigator/cases', { replace: true });
    setLoading(false);
  }

  function loadDemo(cred: typeof DEMO_CREDENTIALS[0]) { setUsername(cred.username); setPassword(cred.password); setError(''); }

  return (
    <main className="min-h-screen bg-canvas flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8"><VeilProofLogo /></div>
        <div className="bg-surface border border-rule rounded-[12px] p-8">
          <h1 className="text-[22px] font-semibold text-ink-1 mb-1">Staff sign in</h1>
          <p className="text-[13px] text-ink-muted mb-6">Demo authentication — select an account below</p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <TextInput label="Username" value={username} onChange={setUsername} placeholder="arjun.mehta" required />
            <TextInput label="Password" type="text" value={password} onChange={setPassword} placeholder="demo-inv" required />
            {error && (
              <p className="text-[13px] text-error bg-error-bg rounded-[6px] px-3 py-2 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                {error}
              </p>
            )}
            <Button type="submit" variant="primary" fullWidth loading={loading}>Sign in</Button>
          </form>
          <div className="mt-6 border-t border-rule pt-5">
            <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-3">Demo accounts</p>
            <div className="flex flex-col gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button key={cred.username} type="button" onClick={() => loadDemo(cred)} className="text-left px-3 py-2.5 rounded-[6px] border border-rule hover:bg-surface-hover transition-colors text-[13px] text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1">
                  <span className="font-medium text-ink-1">{cred.label}</span>
                  <span className="text-ink-muted ml-2 text-[12px]">({cred.username} / {cred.password})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[12px] text-ink-muted text-center mt-6">No public staff registration. Demo only.</p>
      </div>
    </main>
  );
}
