import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { useCase, useApp, useInvestigator } from '../../store/AppContext';

function useCountdown(expiresAt: string | undefined): number {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0
  );
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function formatMs(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function EvidenceViewerPage() {
  const { caseId, evidenceId, mode } = useParams<{ caseId: string; evidenceId: string; mode?: string }>();
  const { session } = useInvestigator();
  const { dispatch, toast } = useApp();
  const navigate = useNavigate();
  const caseRecord = useCase(caseId);
  const expiredRef = useRef(false);

  const isOriginalMode = mode === 'original';

  const ev = caseRecord?.evidence.find((e) => e.id === evidenceId);
  const oar = ev?.originalAccessRequestId
    ? caseRecord?.originalAccessRequests.find((r) => r.id === ev.originalAccessRequestId)
    : undefined;

  const remainingMs = useCountdown(isOriginalMode ? oar?.accessExpiresAt : undefined);

  // Auto-expire when countdown hits 0
  useEffect(() => {
    if (isOriginalMode && remainingMs === 0 && oar && caseId && session && !expiredRef.current) {
      expiredRef.current = true;
      dispatch({
        type: 'END_ORIGINAL_ACCESS',
        payload: {
          caseId,
          requestId: oar.id,
          reason: 'expired',
          actorId: session.investigator.id,
          actorName: session.investigator.name,
          actorRole: session.investigator.role,
        },
      });
      toast('info', 'Sealed original access has expired.');
      navigate(`/investigator/cases/${caseId}`, { replace: true });
    }
  }, [remainingMs, isOriginalMode, oar, caseId, session, dispatch, toast, navigate]);

  // Close the viewer as soon as the window ends (expired, revoked or ended elsewhere)
  useEffect(() => {
    if (isOriginalMode && oar && caseId && oar.status !== 'approved' && !expiredRef.current) {
      expiredRef.current = true;
      toast('info', oar.status === 'revoked' ? 'Access was revoked. The viewer has closed.' : 'Sealed original access has ended. The viewer has closed.');
      navigate(`/investigator/cases/${caseId}`, { replace: true });
    }
  }, [isOriginalMode, oar, caseId, toast, navigate]);

  if (!caseRecord) return <ErrorState title="Case not found" />;
  if (!ev) return <ErrorState title="Evidence not found" description="This evidence item does not exist in this case." />;

  // Protected copy mode
  if (!isOriginalMode) {
    if (ev.protectedCopyStatus !== 'released') {
      return (
        <div className="flex flex-col gap-6 max-w-[600px]">
          <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
            <Link to="/investigator/cases" className="hover:text-ink-1">Cases</Link>
            <span>/</span>
            <Link to={`/investigator/cases/${caseId}`} className="hover:text-ink-1 font-mono">{caseRecord.reference}</Link>
            <span>/</span>
            <span>Evidence</span>
          </nav>
          <div className="border border-rule rounded-[12px] bg-surface p-8 text-center">
            <p className="text-[16px] font-semibold text-ink-1 mb-2">Protected copy not yet released</p>
            <p className="text-[14px] text-ink-2">The Privacy Officer has not yet released this protected copy.</p>
            <Link to={`/investigator/cases/${caseId}`} className="text-[13px] text-ember hover:underline mt-4 block">
              Back to case
            </Link>
          </div>
        </div>
      );
    }

    const previewText = `Protected copy — fictional demo content only.\n\nFile: ${ev.name}\nMetadata removed: ${ev.metadataRemoved.join(', ')}\n\nThis is a simulated document preview. No real file has been uploaded or accessed.\nAll identifying metadata has been removed from this copy.\n\n[Fictional document content for demonstration purposes only.]`;

    return (
      <div className="flex flex-col gap-6 max-w-[720px]">
        <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
          <Link to="/investigator/cases" className="hover:text-ink-1">Cases</Link>
          <span>/</span>
          <Link to={`/investigator/cases/${caseId}`} className="hover:text-ink-1 font-mono">{caseRecord.reference}</Link>
          <span>/</span>
          <span className="text-ink-1">Protected copy</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold text-ink-1">{ev.name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-ink-muted">
              <span className="flex items-center gap-1 text-success">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Protected copy
              </span>
              {ev.protectedCopyReleasedAt && (
                <span>Released {formatDateTime(ev.protectedCopyReleasedAt)} by {ev.protectedCopyReleasedByName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-success-bg rounded-[8px] text-[13px] text-success flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Metadata stripped: {ev.metadataRemoved.join(', ')}
        </div>

        <div className="p-3 bg-ember-soft rounded-[8px] text-[13px] text-ember">
          Demo — fictional bundled evidence. No real file has been uploaded or accessed.
        </div>

        <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
          <div className="px-5 py-3 border-b border-rule bg-surface-2 flex items-center gap-2">
            <p className="text-[13px] font-medium text-ink-2">Document preview</p>
            <span className="text-[11px] text-ink-muted italic">Simulated — fictional content</span>
          </div>
          <div className="p-5">
            <pre className="text-[13px] font-mono text-ink-1 leading-relaxed whitespace-pre-wrap break-words">
              {previewText}
            </pre>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to={`/investigator/cases/${caseId}`} className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors">
            Back to case
          </Link>
          <Link to={`/investigator/cases/${caseId}/audit`} className="text-[13px] text-ember hover:underline">
            Audit trail
          </Link>
        </div>
      </div>
    );
  }

  // Sealed original mode
  if (!oar || ev.sealedOriginalStatus !== 'access_granted') {
    return (
      <div className="flex flex-col gap-6 max-w-[600px]">
        <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
          <Link to="/investigator/cases" className="hover:text-ink-1">Cases</Link>
          <span>/</span>
          <Link to={`/investigator/cases/${caseId}`} className="hover:text-ink-1 font-mono">{caseRecord.reference}</Link>
          <span>/</span>
          <span>Sealed original</span>
        </nav>
        <div className="border border-rule rounded-[12px] bg-surface p-8 text-center">
          <div className="w-10 h-10 rounded-full bg-warning-bg flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-warning">
              <rect x="5" y="9" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 9V7a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[16px] font-semibold text-ink-1 mb-2">Sealed original — access not granted</p>
          <p className="text-[14px] text-ink-2 leading-relaxed mb-4">
            Sealed original access requires approval from both the Privacy Officer and Oversight Officer.
          </p>
          <Link to={`/investigator/cases/${caseId}`} className="text-[14px] font-medium text-ember hover:underline">
            Back to case
          </Link>
        </div>
      </div>
    );
  }

  function handleEndAccess() {
    if (!caseId || !oar || !session) return;
    expiredRef.current = true;
    dispatch({
      type: 'END_ORIGINAL_ACCESS',
      payload: {
        caseId,
        requestId: oar.id,
        reason: 'ended',
        actorId: session.investigator.id,
        actorName: session.investigator.name,
        actorRole: session.investigator.role,
      },
    });
    toast('success', 'Sealed original access ended.');
    navigate(`/investigator/cases/${caseId}`, { replace: true });
  }

  const isLow = remainingMs < 5 * 60 * 1000;

  const previewText = `Sealed original — fictional demo content only.\n\nFile: ${ev.name}\nOriginal metadata preserved for investigation purposes.\n\n[Fictional original document content for demonstration purposes only.]\n\nApproved by: ${oar.privacyDecidedByName} (Privacy), ${oar.oversightDecidedByName} (Oversight)\nAccess purpose: ${oar.purpose}`;

  return (
    <div className="flex flex-col gap-6 max-w-[720px]">
      <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Link to="/investigator/cases" className="hover:text-ink-1">Cases</Link>
        <span>/</span>
        <Link to={`/investigator/cases/${caseId}`} className="hover:text-ink-1 font-mono">{caseRecord.reference}</Link>
        <span>/</span>
        <span className="text-ink-1">Sealed original</span>
      </nav>

      {/* Countdown banner */}
      <div className={`rounded-[10px] p-4 flex items-center justify-between gap-4 ${isLow ? 'bg-error-bg border border-error/30' : 'bg-warning-bg border border-warning/30'}`}>
        <div>
          <p className={`text-[13px] font-semibold ${isLow ? 'text-error' : 'text-warning'}`}>
            {isLow ? 'Access expiring soon' : 'Timed access — sealed original'}
          </p>
          <p className="text-[12px] text-ink-muted mt-0.5">
            Access expires {oar.accessExpiresAt ? formatDateTime(oar.accessExpiresAt) : '—'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-[22px] font-mono font-bold tabular-nums ${isLow ? 'text-error' : 'text-warning'}`}>
            {formatMs(remainingMs)}
          </span>
          <Button variant="secondary" size="sm" onClick={handleEndAccess}>
            End access now
          </Button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-ink-1">{ev.name}</h1>
          <div className="flex flex-wrap gap-3 mt-2 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1 text-warning">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M6 4v3M6 9h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              Sealed original — unstripped metadata
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-ember-soft rounded-[8px] text-[13px] text-ember">
        Demo — fictional bundled evidence. No real file has been uploaded or accessed. This simulates sealed original access.
      </div>

      <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
        <div className="px-5 py-3 border-b border-rule bg-surface-2 flex items-center gap-2">
          <p className="text-[13px] font-medium text-ink-2">Sealed original preview</p>
          <span className="text-[11px] text-ink-muted italic">Simulated — fictional content</span>
        </div>
        <div className="p-5">
          <pre className="text-[13px] font-mono text-ink-1 leading-relaxed whitespace-pre-wrap break-words">
            {previewText}
          </pre>
        </div>
      </div>

      <div className="flex gap-3">
        <Link to={`/investigator/cases/${caseId}`} className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors">
          Back to case
        </Link>
      </div>
    </div>
  );
}
