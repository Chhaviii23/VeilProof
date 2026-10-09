import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuditTimeline } from '../../components/ui/AuditTimeline';
import { ErrorState } from '../../components/ui/ErrorState';
import { useCase } from '../../store/AppContext';

export function AuditPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const caseRecord = useCase(caseId);

  if (!caseRecord) return <ErrorState title="Case not found" />;

  return (
    <div className="flex flex-col gap-6 max-w-[600px]">
      <nav className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Link to="/investigator/cases" className="hover:text-ink-1">Cases</Link>
        <span>/</span>
        <Link to={`/investigator/cases/${caseId}`} className="hover:text-ink-1 font-mono">{caseRecord.reference}</Link>
        <span>/</span>
        <span className="text-ink-1">Audit trail</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-ink-1">Audit trail</h1>
        <span className="text-[12px] text-ink-muted italic">Demo audit trail</span>
      </div>

      <div className="p-3 bg-info-bg rounded-[8px] text-[13px] text-info">
        This trail records significant events for {caseRecord.reference}. Actor identity, scope, and time are recorded for each event. No report content or secrets are shown.
      </div>

      <div className="border border-rule rounded-[12px] bg-surface p-5">
        <AuditTimeline events={caseRecord.auditTrail} />
      </div>
    </div>
  );
}
