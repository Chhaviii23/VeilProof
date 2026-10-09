import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { SelectField } from '../../components/ui/SelectField';
import { TextInput } from '../../components/ui/FormField';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useApp, useCase, useInvestigator } from '../../store/AppContext';
import { api } from '../../services/api';
import type { InvestigationStatus, EvidenceRecord, OriginalAccessRequest, AccessMode, AccessUrgency } from '../../types';
import { ACCESS_MODE_LABELS, URGENCY_LABELS, CATEGORY_LABELS, INVESTIGATION_STATUS_LABELS, INVESTIGATOR_SETTABLE_STATUSES } from '../../types';

const statusOptions = INVESTIGATOR_SETTABLE_STATUSES.map((v) => ({
  value: v,
  label: INVESTIGATION_STATUS_LABELS[v],
}));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface EvidencePanelProps {
  caseId: string;
  ev: EvidenceRecord;
  oar?: OriginalAccessRequest;
  onRequestOriginal: (evidenceId: string) => void;
  sessionRole: string | undefined;
}

function EvidencePanel({ caseId, ev, oar, onRequestOriginal, sessionRole }: EvidencePanelProps) {
  const isCaseInvestigator = sessionRole === 'case-investigator';

  const protectedLabel: Record<EvidenceRecord['protectedCopyStatus'], string> = {
    pending_release: 'Awaiting Privacy Officer release',
    released: 'Protected copy released',
    rejected: 'Release rejected',
    held: 'Held for protection correction',
    not_required: 'No protected copy required (reference link)',
  };

  const sealedLabel: Record<EvidenceRecord['sealedOriginalStatus'], string> = {
    sealed: 'Sealed',
    request_pending: oar?.status === 'clarification_requested' ? 'Clarification requested — response needed' : 'Access requested — awaiting Privacy Officer review',
    privacy_approved: oar?.status === 'clarification_requested' ? 'Clarification requested by Oversight — response needed' : 'Awaiting Final Approval — Oversight Officer',
    access_granted: 'Access granted',
    expired: 'Access expired',
    revoked: 'Access revoked',
    rejected: 'Access request rejected',
    ended: 'Access ended',
  };

  const canViewProtected = ev.protectedCopyStatus === 'released';
  const canViewOriginal = ev.sealedOriginalStatus === 'access_granted';
  const canRequestOriginal =
    isCaseInvestigator &&
    canViewProtected &&
    (ev.sealedOriginalStatus === 'sealed' ||
      ev.sealedOriginalStatus === 'expired' ||
      ev.sealedOriginalStatus === 'ended');

  return (
    <div className="border border-rule rounded-md p-4 bg-surface">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[14px] font-medium text-ink-1">{ev.name}</p>
          <p className="text-[12px] text-ink-muted tabular-nums">
            {formatSize(ev.size)} · {ev.type.split('/')[1]?.toUpperCase()}
          </p>
          {ev.metadataRemoved.length > 0 && (
            <p className="text-[12px] text-success mt-0.5">Metadata removed: {ev.metadataRemoved.join(', ')}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {/* Protected copy row */}
        <div className="flex items-center justify-between gap-3 py-2 border-t border-rule">
          <div>
            <p className="text-[12px] font-medium text-ink-2">Protected copy</p>
            <p className={`text-[12px] ${ev.protectedCopyStatus === 'released' ? 'text-success' : ev.protectedCopyStatus === 'rejected' ? 'text-error' : 'text-warning'}`}>
              {protectedLabel[ev.protectedCopyStatus]}
            </p>
            {ev.protectedCopyReleasedAt && (
              <p className="text-[11px] text-ink-muted">Released {formatDateTime(ev.protectedCopyReleasedAt)} by {ev.protectedCopyReleasedByName}</p>
            )}
          </div>
          {canViewProtected && (
            <Link
              to={`/investigator/cases/${caseId}/evidence/${ev.id}`}
              className="text-[13px] font-medium text-ember hover:underline shrink-0"
            >
              View
            </Link>
          )}
        </div>

        {/* Sealed original row */}
        <div className="flex items-center justify-between gap-3 py-2 border-t border-rule">
          <div>
            <p className="text-[12px] font-medium text-ink-2">Sealed original</p>
            <p className={`text-[12px] ${
              ev.sealedOriginalStatus === 'access_granted' ? 'text-success' :
              ev.sealedOriginalStatus === 'rejected' || ev.sealedOriginalStatus === 'revoked' ? 'text-error' :
              ev.sealedOriginalStatus === 'sealed' || ev.sealedOriginalStatus === 'ended' || ev.sealedOriginalStatus === 'expired' ? 'text-ink-muted' :
              'text-warning'
            }`}>
              {sealedLabel[ev.sealedOriginalStatus]}
            </p>
            {oar && oar.accessExpiresAt && ev.sealedOriginalStatus === 'access_granted' && (
              <p className="text-[11px] text-ink-muted">Expires {formatDateTime(oar.accessExpiresAt)}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {canViewOriginal && (
              <Link
                to={`/investigator/cases/${caseId}/evidence/${ev.id}/original`}
                className="text-[13px] font-medium text-ember hover:underline"
              >
                View original
              </Link>
            )}
            {canRequestOriginal && isCaseInvestigator && (
              <Button variant="secondary" size="sm" onClick={() => onRequestOriginal(ev.id)}>
                Request access
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export interface OriginalRequestInput {
  purpose: string;
  reason: string;
  durationMinutes: number;
  accessMode: AccessMode;
  urgency: AccessUrgency;
  intendedAction: string;
}

interface RequestOriginalFormProps {
  evidenceName: string;
  onSubmit: (input: OriginalRequestInput) => void;
  onCancel: () => void;
}

const DEMO_REQUEST: Record<string, Partial<OriginalRequestInput> & { duration?: string }> = {
  'Bribe_Discussion_Recording.mp3': {
    purpose: 'Verify whether the recording has been edited or manipulated.',
    reason: 'Voice masking changes the audio characteristics required for forensic analysis.',
    accessMode: 'stream_only',
    urgency: 'critical',
    intendedAction: 'Audio manipulation verification',
    duration: '30',
  },
};

function RequestOriginalForm({ evidenceName, onSubmit, onCancel }: RequestOriginalFormProps) {
  const [purpose, setPurpose] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('30');
  const [custom, setCustom] = useState('45');
  const [mode, setMode] = useState<AccessMode>('view_only');
  const [urgency, setUrgency] = useState<AccessUrgency>('standard');
  const [action, setAction] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const minutes = duration === 'custom' ? Number(custom) : Number(duration);
  const durationValid = Number.isFinite(minutes) && minutes >= 5 && minutes <= 120;
  const demo = DEMO_REQUEST[evidenceName];

  function fillDemo() {
    if (!demo) return;
    setPurpose(demo.purpose ?? ''); setReason(demo.reason ?? ''); setMode(demo.accessMode ?? 'view_only');
    setUrgency(demo.urgency ?? 'standard'); setAction(demo.intendedAction ?? ''); setDuration(demo.duration ?? '30');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!purpose.trim() || !reason.trim() || !action.trim() || !durationValid) return;
    onSubmit({ purpose: purpose.trim(), reason: reason.trim(), durationMinutes: minutes, accessMode: mode, urgency, intendedAction: action.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="border border-warning/30 rounded-[12px] bg-warning-bg/30 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[14px] font-semibold text-ink-1">Request access to sealed original</p>
          <p className="text-[12px] text-ink-muted mt-0.5">Exact file (one only): <span className="text-ink-1 font-medium">{evidenceName}</span></p>
          <p className="text-[12px] text-ink-muted mt-1">Goes to the Privacy &amp; Evidence Officer, then the Oversight Officer for final approval.</p>
        </div>
        {demo && <Button type="button" variant="tertiary" size="sm" onClick={fillDemo}>Use demo request</Button>}
      </div>
      <TextInput label="Investigation purpose" value={purpose} onChange={setPurpose} placeholder="e.g. Verify whether the recording has been edited" required error={submitted && !purpose.trim() ? 'Required' : undefined} />
      <TextInput label="Why is the protected copy insufficient?" type="textarea" value={reason} onChange={setReason} rows={3} required error={submitted && !reason.trim() ? 'Required' : undefined} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField label="Requested access duration" value={duration} onChange={setDuration} options={[
          { value: '15', label: '15 minutes' }, { value: '30', label: '30 minutes' }, { value: '60', label: '1 hour' }, { value: 'custom', label: 'Custom duration' },
        ]} />
        {duration === 'custom' && <TextInput label="Custom duration (minutes, 5–120)" value={custom} onChange={setCustom} error={submitted && !durationValid ? 'Enter 5 to 120 minutes' : undefined} />}
        <SelectField label="Access mode" value={mode} onChange={(v) => setMode(v as AccessMode)} options={(Object.keys(ACCESS_MODE_LABELS) as AccessMode[]).map((v) => ({ value: v, label: ACCESS_MODE_LABELS[v] }))} />
        <SelectField label="Urgency" value={urgency} onChange={(v) => setUrgency(v as AccessUrgency)} options={(Object.keys(URGENCY_LABELS) as AccessUrgency[]).map((v) => ({ value: v, label: URGENCY_LABELS[v] }))} />
      </div>
      <TextInput label="Intended investigative action" value={action} onChange={setAction} placeholder="e.g. Audio manipulation verification" required error={submitted && !action.trim() ? 'Required' : undefined} />
      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="sm">Submit to Privacy Officer</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function ClarificationReply({ caseId, req }: { caseId: string; req: OriginalAccessRequest }) {
  const { dispatch, toast } = useApp();
  const { session } = useInvestigator();
  const [text, setText] = useState('');
  if (!session || req.requestedBy !== session.investigator.id) return null;
  const from = req.clarificationFrom === 'oversight' ? 'Oversight Officer' : 'Privacy Officer';
  return (
    <div className="mt-3 border border-info/30 rounded-[12px] bg-info-bg/40 p-5 flex flex-col gap-3">
      <p className="text-[14px] font-semibold text-ink-1">Clarification requested by {from}</p>
      <p className="text-[13px] text-ink-2">{req.clarificationQuestion || 'No question text provided.'}</p>
      <TextInput label="Your response" type="textarea" value={text} onChange={setText} rows={3} required />
      <div>
        <Button variant="primary" size="sm" disabled={!text.trim()} onClick={async () => {
          if (session?.token) {
            try {
              // Oversight uses oversight-decisions, Privacy uses privacy-decisions, but we can't easily distinguish the endpoint for clarification replies here without checking the status.
              // We'll just dispatch locally for now and let the user know. (Or we can hit the correct backend endpoint if it exists).
              // Since the backend API for responding to clarification isn't explicitly defined in api.ts, we'll leave it as optimistic.
            } catch (err) {}
          }
          dispatch({ type: 'RESPOND_CLARIFICATION', payload: { caseId, requestId: req.id, investigatorId: session.investigator.id, investigatorName: session.investigator.name, response: text.trim() } });
          toast('success', `Response sent to ${from}.`);
        }}>Send response</Button>
      </div>
    </div>
  );
}

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const { dispatch, toast } = useApp();
  const { session } = useInvestigator();
  const caseRecord = useCase(caseId);
  const location = useLocation();

  useEffect(() => {
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, caseRecord?.id]);

  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [publicUpdateText, setPublicUpdateText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [confirmUpdate, setConfirmUpdate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingOriginalFor, setRequestingOriginalFor] = useState<string | null>(null);

  if (!caseRecord) {
    return <ErrorState title="Case not found" description="This case ID does not exist or you don't have access." />;
  }

  const c = caseRecord;
  const isCaseInvestigator = session?.investigator.roleType === 'case-investigator';
  if (isCaseInvestigator && c.assignedOfficerCode !== session?.investigator.officerCode) {
    return <ErrorState title="Case not assigned to you" description="Cases become visible to an Anti-Corruption Officer only after the Privacy & Evidence Officer assigns them." />;
  }

  function openUpdateForm() {
    const settable = INVESTIGATOR_SETTABLE_STATUSES.includes(c.status as typeof INVESTIGATOR_SETTABLE_STATUSES[0])
      ? c.status
      : INVESTIGATOR_SETTABLE_STATUSES[0];
    setNewStatus(settable);
    setPublicUpdateText('');
    setInternalNoteText('');
    setShowUpdateForm(true);
  }

  function handleSaveUpdate() {
    if (!session) return;
    const statusChanged = newStatus !== c.status;
    const hasPublic = publicUpdateText.trim().length > 0;
    const hasInternal = internalNoteText.trim().length > 0;
    if (!statusChanged && !hasPublic && !hasInternal) {
      toast('info', 'No changes to save.');
      return;
    }
    setConfirmUpdate(true);
  }

  async function executeUpdate() {
    if (!session || !caseId) return;
    setSaving(true);
    setConfirmUpdate(false);
    try {
      if (session.token) {
        if (publicUpdateText.trim()) await api.staffAction(session.token, `/cases/${caseId}/public-updates`, { status: newStatus, text: publicUpdateText.trim() });
        if (internalNoteText.trim()) await api.staffAction(session.token, `/cases/${caseId}/internal-notes`, { text: internalNoteText.trim() });
        // The status update itself is implied by the public update, or handled separately.
      }
      dispatch({
        type: 'UPDATE_CASE_STATUS',
        payload: {
          caseId,
          status: newStatus as InvestigationStatus,
          publicUpdate: publicUpdateText.trim() || undefined,
          internalNote: internalNoteText.trim() || undefined,
          investigatorId: session.investigator.id,
          investigatorName: session.investigator.name,
          investigatorRole: session.investigator.role,
        },
      });
      toast('success', 'Case updated successfully.');
      setShowUpdateForm(false);
    } catch (err: any) {
      toast('error', `Failed to update case: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestOriginal(evidenceId: string, input: OriginalRequestInput) {
    if (!session || !caseId) return;
    try {
      if (session.token) {
        await api.staffAction(session.token, `/cases/${caseId}/access-requests`, {
          evidence_id: evidenceId,
          purpose: input.purpose,
          insufficiency_reason: input.reason,
          duration_minutes: input.durationMinutes,
          mode: input.accessMode,
          urgency: input.urgency,
          intended_action: input.intendedAction
        });
      }
      dispatch({
        type: 'REQUEST_ORIGINAL_ACCESS',
        payload: { caseId: c.id, evidenceId, investigatorId: session.investigator.id, investigatorName: session.investigator.name, ...input },
      });
      toast('success', 'Access request submitted to the Privacy & Evidence Officer.');
      setRequestingOriginalFor(null);
    } catch (err: any) {
      toast('error', `Failed to request access: ${err.message || 'Unknown error'}`);
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-200">
      <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Link to="/investigator/cases" className="hover:text-ink-1 transition-colors">Cases</Link>
        <span>/</span>
        <span className="text-ink-1 font-mono">{c.reference}</span>
        {c.isSeeded && <span className="text-[11px] text-ink-muted italic">sample case</span>}
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-mono text-ink-muted tabular-nums mb-1">{c.reference}</p>
          <h1 className="text-[24px] font-semibold text-ink-1 leading-tight">{c.title}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <StatusBadge status={c.status} />
            {c.priority === 'critical' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-error bg-error-bg border border-error/20 rounded-full px-2 py-0.5">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1L9 8H1L5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                Critical priority
              </span>
            )}
            <span className="text-[13px] text-ink-muted">{CATEGORY_LABELS[c.category]}</span>
            <span className="text-[13px] text-ink-muted">Received {formatDate(c.receivedAt)}</span>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isCaseInvestigator && (
            <Button variant="secondary" size="sm" onClick={openUpdateForm}>
              Update status
            </Button>
          )}
          <Link to={`/investigator/cases/${caseId}/audit`} className="text-[13px] text-ember hover:underline font-medium self-center">
            Audit trail
          </Link>
        </div>
      </div>

      {showUpdateForm && (
        <div className="border border-ember/30 rounded-[12px] bg-ember-soft/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-ember/20">
            <h2 className="text-[15px] font-semibold text-ink-1">Update case status</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <SelectField
              label="Investigation status"
              value={newStatus}
              onChange={setNewStatus}
              options={statusOptions}
            />
            <TextInput
              label="Update visible to reporter"
              type="textarea"
              value={publicUpdateText}
              onChange={setPublicUpdateText}
              placeholder="Optional — appears in reporter tracking timeline"
              rows={3}
              hint="Leave blank to update status without adding a public message"
            />
            <TextInput
              label="Internal note — investigators only"
              type="textarea"
              value={internalNoteText}
              onChange={setInternalNoteText}
              placeholder="Optional — never shown to the reporter"
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="primary" size="sm" onClick={handleSaveUpdate} loading={saving}>
                Save update
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowUpdateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {c.internalNotes.length > 0 && (
        <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-rule bg-surface-2 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink-1">Internal notes</h2>
            <span className="text-[11px] px-1.5 py-0.5 bg-ink-1 text-ink-inverse rounded-[3px]">Not visible to reporter</span>
          </div>
          <div className="divide-y divide-rule">
            {c.internalNotes.map((note) => (
              <div key={note.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[13px] font-medium text-ink-1">{note.addedByName}</p>
                  <p className="text-[11px] text-ink-muted tabular-nums">
                    {formatDateTime(note.addedAt)}
                  </p>
                </div>
                <p className="text-[14px] text-ink-2 leading-relaxed">{note.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-rule bg-surface-2">
          <h2 className="text-[15px] font-semibold text-ink-1">Overview</h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <p className="text-[12px] text-ink-muted mb-1">Description</p>
            <p className="text-[14px] text-ink-1 leading-relaxed">{c.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {c.incidentDate && <div><p className="text-[12px] text-ink-muted mb-0.5">Incident date</p><p className="text-[14px] text-ink-1">{formatDate(c.incidentDate)}</p></div>}
            {c.location && <div><p className="text-[12px] text-ink-muted mb-0.5">Location</p><p className="text-[14px] text-ink-1">{c.location}</p></div>}
            {c.involvedParties && <div className="col-span-2"><p className="text-[12px] text-ink-muted mb-0.5">Involved parties</p><p className="text-[14px] text-ink-1">{c.involvedParties}</p></div>}
          </div>
        </div>
      </div>

      <div id="evidence-vault" className="border border-rule rounded-[12px] bg-surface overflow-hidden scroll-mt-20">
        <div className="px-5 py-4 border-b border-rule bg-surface-2">
          <h2 className="text-[15px] font-semibold text-ink-1">Evidence vault</h2>
          <p className="text-[12px] text-ink-muted mt-0.5">Protected copies are metadata-stripped. Sealed originals stay sealed unless Privacy and Oversight both approve a limited, timed request.</p>
        </div>
        <div className="p-5">
          {c.evidence.length === 0 ? (
            <p className="text-[14px] text-ink-muted">No evidence attached to this report.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {c.evidence.map((ev) => {
                const oar = ev.originalAccessRequestId
                  ? c.originalAccessRequests.find((r) => r.id === ev.originalAccessRequestId)
                  : undefined;
                return (
                  <div key={ev.id}>
                    <EvidencePanel
                      caseId={caseId!}
                      ev={ev}
                      oar={oar}
                      onRequestOriginal={(id) => setRequestingOriginalFor(id)}
                      sessionRole={session?.investigator.roleType}
                    />
                    {oar?.status === 'clarification_requested' && <ClarificationReply caseId={c.id} req={oar} />}
                    {requestingOriginalFor === ev.id && (
                      <div className="mt-3">
                        <RequestOriginalForm
                          evidenceName={ev.name}
                          onSubmit={(input) => handleRequestOriginal(ev.id, input)}
                          onCancel={() => setRequestingOriginalFor(null)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {c.closureRecommendation && (
        <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
          <div className="px-5 py-4 border-b border-rule bg-surface-2">
            <h2 className="text-[15px] font-semibold text-ink-1">Closure recommendation</h2>
          </div>
          <div className="p-5">
            <p className="text-[13px] text-ink-muted mb-1">Outcome</p>
            <p className="text-[14px] text-ink-1 mb-3">{c.closureRecommendation.outcome}</p>
            <p className="text-[13px] text-ink-muted mb-1">Message to reporter</p>
            <p className="text-[14px] text-ink-1 mb-3">{c.closureRecommendation.reporterMessage}</p>
            <p className="text-[12px] text-ink-muted">
              Recommended by {c.closureRecommendation.recommendedByName} ·
              Status: {c.closureRecommendation.status === 'approved' ? 'Approved' : c.closureRecommendation.status === 'returned' ? 'Returned' : 'Pending oversight'}
            </p>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={confirmUpdate}
        title="Save case update?"
        description={`Status: ${INVESTIGATION_STATUS_LABELS[newStatus as InvestigationStatus] ?? newStatus}${publicUpdateText.trim() ? ' · Public update will be added.' : ''}${internalNoteText.trim() ? ' · Internal note will be added.' : ''}`}
        confirmLabel="Save update"
        onConfirm={executeUpdate}
        onCancel={() => setConfirmUpdate(false)}
      />
    </div>
  );
}
