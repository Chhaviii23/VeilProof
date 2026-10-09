import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextInput } from '../../components/ui/FormField';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../store/AppContext';
import { trackComplaint } from '../../services/reporter';

export function TrackPage() {
  const { state, dispatch, toast } = useApp();
  const [caseRef, setCaseRef] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const hasReceipt = !!state.receipt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ref = caseRef.trim();
    const sec = secret.trim();
    if (!ref || !sec) { setError('Both fields are required.'); return; }
    setError('');
    setLoading(true);
    try {
      // Server-side reference + secret authentication (no client-side secret map).
      await trackComplaint(ref, sec);
      const found = state.cases.find((c) => c.reference === ref);
      dispatch({
        type: 'SET_RECEIPT',
        payload: {
          caseReference: ref,
          trackingSecret: sec,
          submittedAt: found?.receivedAt ?? new Date().toISOString(),
          attachmentCount: found?.evidence.length ?? 0,
          proofStatus: 'pending',
        },
      });
      navigate('/track/status');
    } catch {
      setError('The case reference and tracking secret do not match. Please check and try again.');
    } finally {
      setLoading(false);
    }
  }

  function loadDemoReceipt() {
    if (!state.receipt) {
      // Load the first seed case
      const firstSecret = Object.entries(state.trackingSecrets)[0];
      if (firstSecret) {
        setCaseRef(firstSecret[0]);
        setSecret(firstSecret[1]);
        setError('');
        toast('info', 'Demo credentials loaded.');
      }
    } else {
      setCaseRef(state.receipt.caseReference);
      setSecret(state.receipt.trackingSecret);
      setError('');
      toast('info', 'Demo receipt credentials loaded.');
    }
  }

  return (
    <main className="max-w-[560px] mx-auto px-5 md:px-8 py-12 pb-20 md:pb-12">
      <h1 className="text-[28px] md:text-[34px] font-semibold text-ink-1 leading-tight">Track a report</h1>
      <p className="text-[16px] text-ink-2 mt-2 leading-relaxed">
        Enter your case reference and private tracking secret to view your report status.
      </p>

      {hasReceipt && (
        <div className="mt-6 p-4 bg-ember-soft border border-ember/20 rounded-[8px] flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium text-ember">Latest demo complaint</p>
            <p className="text-[13px] font-mono text-ink-1">{state.receipt!.caseReference}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/track/status')}
          >
            Track now
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" noValidate>
        <TextInput
          label="Case reference"
          value={caseRef}
          onChange={setCaseRef}
          placeholder="VP-2024-0042"
          hint="Found on your receipt"
          required
        />
        <TextInput
          label="Private tracking secret"
          value={secret}
          onChange={setSecret}
          placeholder="TRK-XXXX-XXXX-XXXX"
          hint="Separate from your case reference — do not share it"
          required
        />

        {error && (
          <p className="text-[14px] text-error bg-error-bg rounded-[8px] px-4 py-3 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 mt-0.5">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" fullWidth loading={loading}>
          View status
        </Button>

        <button
          type="button"
          onClick={loadDemoReceipt}
          className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors text-center"
        >
          Load demo receipt
        </button>
      </form>
    </main>
  );
}
