import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useDraft, useApp } from '../../store/AppContext';
import type { CaseRecord, EvidenceRecord } from '../../types';
import { CRITICAL_RISK_FACTORS } from '../../types';

interface Stage {
  id: string;
  label: string;
  state: 'pending' | 'active' | 'done' | 'error';
}

const STAGES: Omit<Stage, 'state'>[] = [
  { id: 'prepare', label: 'Preparing report' },
  { id: 'encrypt', label: 'Simulating encryption' },
  { id: 'upload', label: 'Simulating upload' },
  { id: 'proof', label: 'Recording demo proof' },
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function generateRef(): string {
  const year = new Date().getFullYear();
  const n = Math.floor(1000 + Math.random() * 8999);
  return `VP-${year}-${n}`;
}

function generateTrackingSecret(): string {
  function seg() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
  return `TRK-${seg()}-${seg()}-${seg()}`;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function SubmittingPage() {
  const { draft } = useDraft();
  const { dispatch, toast } = useApp();
  const navigate = useNavigate();
  const submitted = useRef(false);

  const [stages, setStages] = useState<Stage[]>(STAGES.map((s, i) => ({ ...s, state: i === 0 ? 'active' : 'pending' })));
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  function advanceStage(stageIndex: number, state: Stage['state']) {
    setStages((prev) =>
      prev.map((s, i) => {
        if (i === stageIndex) return { ...s, state };
        if (i === stageIndex + 1 && state === 'done') return { ...s, state: 'active' };
        return s;
      })
    );
  }

  async function runSubmission() {
    if (submitted.current) return;
    submitted.current = true;
    setError(null);
    setStages(STAGES.map((s, i) => ({ ...s, state: i === 0 ? 'active' : 'pending' })));

    try {
      await delay(600);
      advanceStage(0, 'done');
      await delay(500);
      advanceStage(1, 'done');
      await delay(500);
      advanceStage(2, 'done');
      await delay(400);

      const now = new Date().toISOString();
      const caseReference = generateRef();
      const trackingSecret = generateTrackingSecret();
      const caseId = `case-${uid()}`;

      const evidence: EvidenceRecord[] = draft.evidence.map((e) => ({
        id: e.id,
        name: e.sanitizedName ?? e.name,
        type: e.type,
        size: e.size,
        metadataRemoved: e.findings.filter((f) => f.risk !== 'low').map((f) => f.field),
        protectedCopyStatus: 'pending_release',
        sealedOriginalStatus: 'sealed',
      }));

      const isCritical = draft.riskFactors.some((f) => CRITICAL_RISK_FACTORS.has(f));
      const priority: CaseRecord['priority'] = isCritical ? 'critical' : 'standard';

      const caseRecord: CaseRecord = {
        id: caseId,
        reference: caseReference,
        title: draft.title || 'Untitled report',
        category: draft.category as CaseRecord['category'],
        description: draft.description,
        incidentDate: draft.incidentDate || undefined,
        location: draft.location || undefined,
        involvedParties: draft.involvedParties || undefined,
        receivedAt: now,
        lastUpdated: now,
        status: 'privacy_review',
        priority,
        riskFactors: draft.riskFactors,
        evidence,
        originalAccessRequests: [],
        auditTrail: [
          {
            id: `ae-${uid()}`,
            type: 'report_accepted',
            detail: `Report received — ${caseReference}${isCritical ? ' [Critical priority]' : ''}`,
            occurredAt: now,
            caseId,
          },
          {
            id: `ae-${uid()}`,
            type: 'privacy_protection_completed',
            detail: `Evidence sealed. ${evidence.length} file(s) protected.`,
            occurredAt: new Date(Date.now() + 800).toISOString(),
            caseId,
          },
        ],
        publicUpdates: [
          {
            id: `pu-${uid()}`,
            status: 'received_securely',
            text: 'Your report has been received securely. A privacy review is underway.',
            addedAt: now,
          },
        ],
        internalNotes: [],
        assignedInvestigatorId: '',
        protectionSummary: draft.identityProtectionResult,
      };

      function hex(len: number) {
        return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      }
      const txHash = `0x${hex(64)}`;
      const blockTs = new Date(Date.now() + 2000).toISOString();

      const receipt = {
        caseReference,
        trackingSecret,
        submittedAt: now,
        attachmentCount: draft.evidence.length,
        proofStatus: 'confirmed' as const,
        proofTransactionRef: txHash,
        blockchainNetwork: 'Polygon Amoy Testnet',
        blockTimestamp: blockTs,
        contractAddress: `0x${hex(40)}`,
        evidenceCommitment: `0x${hex(64)}`,
      };

      caseRecord.integrity = { proofStatus: receipt.proofStatus, transactionRef: txHash, network: receipt.blockchainNetwork };
      dispatch({ type: 'SUBMIT_COMPLAINT', payload: { caseRecord, receipt, trackingSecret } });
      advanceStage(3, 'done');
      await delay(300);
      navigate('/report/receipt', { replace: true });
    } catch (err) {
      setStages((prev) => prev.map((s) => s.state === 'active' ? { ...s, state: 'error' } : s));
      setError((err as Error).message ?? 'Submission failed. Please try again.');
      submitted.current = false;
    }
  }

  useEffect(() => { runSubmission(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function retry() {
    setRetrying(true);
    submitted.current = false;
    await runSubmission();
    setRetrying(false);
  }

  return (
    <main className="max-w-[520px] mx-auto px-5 md:px-8 py-16 flex flex-col items-center text-center">
      <h1 className="text-[24px] font-semibold text-ink-1 mb-8">Submitting report</h1>

      <div className="w-full flex flex-col gap-3 mb-8">
        {stages.map((stage) => (
          <div key={stage.id} className="flex items-center gap-4 p-4 border border-rule rounded-[8px] bg-surface">
            <div className="shrink-0">
              {stage.state === 'done' && (
                <div className="w-6 h-6 rounded-full bg-success-bg flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#326047" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {stage.state === 'active' && (
                <svg className="animate-spin h-6 w-6 text-ember" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {stage.state === 'pending' && (
                <div className="w-6 h-6 rounded-full border border-rule bg-surface-2" />
              )}
              {stage.state === 'error' && (
                <div className="w-6 h-6 rounded-full bg-error-bg flex items-center justify-center">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="#A12C3A" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              )}
            </div>
            <p className={`text-[14px] font-medium ${
              stage.state === 'done' ? 'text-success' :
              stage.state === 'active' ? 'text-ink-1' :
              stage.state === 'error' ? 'text-error' :
              'text-ink-muted'
            }`}>
              {stage.label}
            </p>
            {(stage.id === 'encrypt' || stage.id === 'upload') && (
              <span className="text-[11px] text-ink-muted ml-auto italic">Simulated</span>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="w-full p-4 bg-error-bg border border-error/30 rounded-[8px] mb-6 text-left">
          <p className="text-[14px] text-error font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Submission failed
          </p>
          <p className="text-[13px] text-ink-2 mt-1">{error}</p>
          <Button variant="primary" size="sm" onClick={retry} loading={retrying} className="mt-3">
            Try again
          </Button>
        </div>
      )}
    </main>
  );
}
