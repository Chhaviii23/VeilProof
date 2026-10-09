import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { EvidenceRow } from '../../components/ui/EvidenceRow';
import { Button } from '../../components/ui/Button';
import { useDraft, useApp } from '../../store/AppContext';
import { CATEGORY_LABELS, RISK_FACTOR_LABELS } from '../../types';
import { StatusBadge } from '../../components/ui/StatusBadge';

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-[15px] text-ink-1 leading-relaxed">{value}</p>
    </div>
  );
}

const scanLabels: Record<string, string> = {
  sanitized: 'Sanitized copy ready',
  found: 'Clues found — not sanitized',
  unsupported: 'Unsupported — not scanned',
  failed: 'Scan failed',
  idle: 'Not scanned',
  scanning: 'Scanning…',
};

export function ReviewPage() {
  const { draft, updateDraft } = useDraft();
  const { toast } = useApp();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const hasErrors =
    !draft.title.trim() ||
    !draft.category ||
    !draft.description.trim() ||
    draft.description.trim().length < 50;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.acknowledged) {
      toast('error', 'Please acknowledge the demo disclaimer before submitting.');
      return;
    }
    if (hasErrors) {
      toast('error', 'Please complete required fields before submitting.');
      return;
    }
    navigate('/report/submitting');
  }

  if (hasErrors) {
    return (
      <main className="max-w-[720px] mx-auto px-5 md:px-8 py-8">
        <h1 className="text-[24px] font-semibold text-ink-1 mb-4">Review report</h1>
        <div className="p-5 border border-error-bg bg-error-bg rounded-[12px]">
          <p className="text-[15px] text-error font-medium flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Required fields are incomplete.
          </p>
          <Link to="/report/details" className="text-[14px] text-ember underline mt-3 block">
            Go back to report details
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[720px] mx-auto px-5 md:px-8 py-8">
      <h1 className="text-[24px] font-semibold text-ink-1 mb-6">Review and submit</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Report details */}
        <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule bg-surface-2">
            <h2 className="text-[15px] font-semibold text-ink-1">Report details</h2>
            <Link to="/report/details" className="text-[13px] text-ember hover:underline">Edit</Link>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <Field label="Title" value={draft.title} />
            <Field label="Category" value={CATEGORY_LABELS[draft.category as keyof typeof CATEGORY_LABELS]} />
            <Field label="Description" value={draft.description} />
            {draft.incidentDate && <Field label="Incident date" value={new Date(draft.incidentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />}
            {draft.location && <Field label="Location" value={draft.location} />}
            {draft.involvedParties && <Field label="Involved parties" value={draft.involvedParties} />}
            {draft.riskFactors.length > 0 && (
              <div>
                <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1">Risk factors</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.riskFactors.map((f) => (
                    <span key={f} className="text-[12px] text-ink-2 bg-surface-2 border border-rule rounded-full px-2.5 py-0.5">
                      {RISK_FACTOR_LABELS[f] ?? f}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Evidence */}
        <div className="border border-rule rounded-[12px] bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-rule bg-surface-2">
            <h2 className="text-[15px] font-semibold text-ink-1">Evidence</h2>
            <Link to="/report/evidence" className="text-[13px] text-ember hover:underline">Edit</Link>
          </div>
          <div className="p-5">
            {draft.evidence.length === 0 ? (
              <p className="text-[14px] text-ink-muted">No evidence attached.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {draft.evidence.map((item) => (
                  <div key={item.id} className="border border-rule rounded-[8px] p-3 bg-canvas">
                    <EvidenceRow item={item} />
                    {draft.identityProtectionApplied && (
                      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-muted border-t border-rule pt-2">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning inline-block" />
                          Original: Encrypted and sealed
                        </span>
                        <span className="flex items-center gap-1 text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          Protected copy: Ready for investigation
                        </span>
                        <span className="flex items-center gap-1 text-success">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          Identity protection: Applied
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Identity protection summary */}
        {draft.identityProtectionApplied && draft.identityProtectionResult && (
          <div className="border border-success/30 rounded-[12px] bg-success-bg/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center shrink-0">
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="text-[14px] font-semibold text-success">Identity Protection Applied</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Names protected', value: draft.identityProtectionResult.namesProtected },
                { label: 'Faces blurred', value: draft.identityProtectionResult.facesBlurred },
                { label: 'Voices masked', value: draft.identityProtectionResult.voicesMasked },
                { label: 'Metadata fields removed', value: draft.identityProtectionResult.metadataFieldsRemoved },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[20px] font-semibold text-success">{value}</p>
                  <p className="text-[12px] text-ink-muted">{label}</p>
                </div>
              ))}
            </div>
            <Link to="/report/identity-protection" className="text-[12px] text-ember hover:underline mt-3 inline-block">
              Review selections
            </Link>
          </div>
        )}

        {/* Recipient */}
        <div className="border border-rule rounded-[12px] p-5 bg-surface">
          <p className="text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1">Recipient organization</p>
          <p className="text-[15px] font-medium text-ink-1">Public Integrity Office</p>
          <p className="text-[13px] text-ink-muted">Demo — fictional organization</p>
        </div>

        {/* Acknowledgement */}
        <label className="flex items-start gap-3 p-4 border border-rule rounded-[8px] bg-surface cursor-pointer hover:bg-surface-hover transition-colors">
          <input
            type="checkbox"
            checked={draft.acknowledged}
            onChange={(e) => updateDraft({ acknowledged: e.target.checked })}
            className="mt-0.5 w-4 h-4 accent-ember"
          />
          <span className="text-[14px] text-ink-2 leading-relaxed">
            I understand this is a demo and have used fictional information.
          </span>
        </label>

        <div className="flex justify-between">
          <Button type="button" variant="secondary" onClick={() => navigate('/report/identity-protection')}>
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!draft.acknowledged || submitting}
          >
            Submit demo report
          </Button>
        </div>
      </form>
    </main>
  );
}
