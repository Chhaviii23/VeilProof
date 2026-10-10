import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import { useCase, useApp, useInvestigator } from '../../store/AppContext';
import { api } from '../../services/api';
import type { EvidenceRecord, OriginalAccessRequest, InvestigatorSession } from '../../types';

function EvidenceContentViewer({
  caseId,
  ev,
  oar,
  isOriginalMode,
  session
}: {
  caseId: string;
  ev: EvidenceRecord;
  oar?: OriginalAccessRequest;
  isOriginalMode: boolean;
  session: InvestigatorSession | null;
}) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.token) return;
    
    let active = true;
    let url = '';
    
    async function loadContent() {
      try {
        let buffer: ArrayBuffer;
        if (isOriginalMode && oar?.grantId) {
          const res = await api.activateGrant(session!.token!, oar.grantId);
          buffer = await api.viewerContent(session!.token!, res.handle);
        } else if (!isOriginalMode) {
          const v = ev.versions?.find((x) => x.kind === 'derivative');
          // Prefer the immutable derivative version, but let the API resolve
          // the evidence-item id too. This makes a refreshed/deep-linked case
          // view resilient to a stale version list.
          buffer = await api.protectedContent(session!.token!, v?.id ?? ev.id);
        } else {
          throw new Error('Cannot view original without a grant');
        }
        
        if (!active) return;
        
        const blob = new Blob([buffer], { type: ev.type });
        url = URL.createObjectURL(blob);
        setContentUrl(url);
      } catch (err: any) {
        if (active) setError(err.message || 'Failed to load evidence');
      } finally {
        if (active) setLoading(false);
      }
    }
    
    loadContent();
    
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [session, isOriginalMode, ev, oar]);

  if (loading) return <div className="p-5 text-ink-muted flex justify-center items-center h-50">Loading actual file content from secure vault...</div>;
  if (error) return <div className="p-5 text-error flex justify-center items-center h-50">{error}</div>;
  if (!contentUrl) return null;
  
  const type = ev.type || '';
  const download = !isOriginalMode && <a href={contentUrl} download={`protected.${type === 'application/pdf' ? 'pdf' : type.startsWith('audio/') ? 'mp3' : type.startsWith('video/') ? 'mp4' : 'jpg'}`} className="block p-3 text-sm text-ember underline">Download protected copy</a>;
  if (type.startsWith('image/')) {
    return (
      <div className="flex flex-col items-center p-5">{download}
        <img src={contentUrl} className="max-w-full h-auto max-h-[70vh] rounded-md border border-rule object-contain" alt="Evidence" />
      </div>
    );
  } else if (type.startsWith('video/')) {
    return (
      <div className="flex flex-col items-center p-5">{download}
        <video src={contentUrl} controls className="max-w-full rounded-md border border-rule" />
      </div>
    );
  } else if (type.startsWith('audio/')) {
    return (
      <div className="p-5">{download}
        <audio src={contentUrl} controls className="w-full" />
      </div>
    );
  } else {
    return (
      <div className="p-0">{download}
        <iframe src={contentUrl} className="w-full h-150 border-0 bg-white" title="Evidence" />
      </div>
    );
  }
}

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
    if (ev.protectedCopyStatus !== 'released' && session?.investigator.roleType === 'case-investigator') {
      return (
        <div className="flex flex-col gap-6 max-w-150">
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

    return (
      <div className="flex flex-col gap-6 max-w-180">
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

        <div className="p-3 bg-success-bg rounded-md text-[13px] text-success flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 7l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Metadata stripped: {ev.metadataRemoved.join(', ')}
        </div>

        <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
          <div className="px-5 py-3 border-b border-rule bg-surface-2 flex items-center gap-2">
            <p className="text-[13px] font-medium text-ink-2">Protected Document</p>
          </div>
          <EvidenceContentViewer caseId={caseId!} ev={ev} isOriginalMode={false} session={session} />
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
      <div className="flex flex-col gap-6 max-w-150">
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

  return (
    <div className="flex flex-col gap-6 max-w-180">
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

      <div className="border border-rule rounded-[12px] overflow-hidden bg-surface">
        <div className="px-5 py-3 border-b border-rule bg-surface-2 flex items-center gap-2">
          <p className="text-[13px] font-medium text-ink-2">Sealed Original</p>
        </div>
        <EvidenceContentViewer caseId={caseId!} ev={ev} oar={oar} isOriginalMode={true} session={session} />
      </div>

      <div className="flex gap-3">
        <Link to={`/investigator/cases/${caseId}`} className="text-[13px] text-ink-muted hover:text-ink-1 underline transition-colors">
          Back to case
        </Link>
      </div>
    </div>
  );
}
