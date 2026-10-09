import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useApp, useInvestigator } from '../store/AppContext';
import { DEMO_INVESTIGATORS } from '../services/fixtures';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, description, value, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-rule last:border-0">
      <div className="flex-1">
        <p className="text-[14px] font-medium text-ink-1">{label}</p>
        <p className="text-[12px] text-ink-muted mt-0.5">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`shrink-0 w-10 h-6 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-1 ${value ? 'bg-ember' : 'bg-surface-2 border border-rule-strong'}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-1 ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

export function DemoPage() {
  const { state, dispatch, toast } = useApp();
  const { session, setSession, clearSession } = useInvestigator();
  const settings = state.demoSettings;

  function switchInvestigator(invId: string) {
    if (session) clearSession();
    const inv = DEMO_INVESTIGATORS.find((i) => i.id === invId);
    if (!inv) return;
    setSession({ investigator: inv, signedInAt: new Date().toISOString() });
    toast('success', `Switched to ${inv.name}`);
  }

  function resetAll() {
    dispatch({ type: 'RESET_DEMO' });
    clearSession();
    toast('success', 'Demo data reset to initial state.');
  }

  return (
    <main className="max-w-[680px] mx-auto px-5 md:px-8 py-12">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-[28px] font-semibold text-ink-1">Demo controls</h1>
        <span className="px-2 py-0.5 rounded-[4px] bg-ember-soft text-ember text-[12px] font-medium">Demo only</span>
      </div>
      <p className="text-[14px] text-ink-2 mb-8">
        All data is in-memory only. Use the Role Switcher toolbar to switch accounts without losing data. Use Reset below to restore seed cases.
      </p>

      {/* Investigator switcher */}
      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-rule bg-surface-2">
          <h2 className="text-[15px] font-semibold text-ink-1">Quick investigator switch</h2>
        </div>
        <div className="p-5 flex flex-col gap-3">
          {DEMO_INVESTIGATORS.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-4 p-3 border border-rule rounded-[8px]">
              <div>
                <p className="text-[14px] font-medium text-ink-1">{inv.name}</p>
                <p className="text-[12px] text-ink-muted">{inv.role}</p>
              </div>
              {session?.investigator.id === inv.id ? (
                <span className="text-[12px] text-success font-medium">Active</span>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => switchInvestigator(inv.id)}>
                  Switch
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Simulation settings */}
      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-rule bg-surface-2">
          <h2 className="text-[15px] font-semibold text-ink-1">Simulation settings</h2>
        </div>
        <div className="px-5">
          <ToggleRow
            label="Simulate slow responses"
            description="Adds artificial delays to async operations"
            value={settings.simulateSlow}
            onChange={(v) => dispatch({ type: 'UPDATE_DEMO_SETTINGS', payload: { simulateSlow: v } })}
          />
          <ToggleRow
            label="Simulate submission failure"
            description="Next report submission will return an error"
            value={settings.simulateSubmissionFailure}
            onChange={(v) => dispatch({ type: 'UPDATE_DEMO_SETTINGS', payload: { simulateSubmissionFailure: v } })}
          />
          <ToggleRow
            label="Simulate pending proof"
            description="Next submission will have a pending proof status"
            value={settings.simulatePendingProof}
            onChange={(v) => dispatch({ type: 'UPDATE_DEMO_SETTINGS', payload: { simulatePendingProof: v } })}
          />
          <ToggleRow
            label="Simulate failed proof"
            description="Next submission will have a failed proof status"
            value={settings.simulateFailedProof}
            onChange={(v) => dispatch({ type: 'UPDATE_DEMO_SETTINGS', payload: { simulateFailedProof: v } })}
          />
        </div>
      </div>

      {/* Reset */}
      <div className="border border-rule rounded-[12px] bg-surface p-5 mb-6">
        <h2 className="text-[15px] font-semibold text-ink-1 mb-2">Reset demo data</h2>
        <p className="text-[13px] text-ink-muted mb-4">Restores all cases and settings to their initial state. Does not affect the page URL or browser history.</p>
        <Button variant="danger" onClick={resetAll}>Reset all demo data</Button>
      </div>

      {/* Navigation links */}
      <div className="flex flex-wrap gap-4 text-[13px]">
        <Link to="/" className="text-ember hover:underline">Home</Link>
        <Link to="/report/details" className="text-ember hover:underline">Start report</Link>
        <Link to="/investigator/cases" className="text-ember hover:underline">Cases</Link>
        <Link to="/track" className="text-ember hover:underline">Track</Link>
        <Link to="/verify" className="text-ember hover:underline">Verify</Link>
      </div>
    </main>
  );
}
