import React from 'react';
import type { AuditEvent, AuditEventType } from '../../types';

interface AuditTimelineProps {
  events: AuditEvent[];
}

const eventConfig: Record<AuditEventType, { label: string; color: string }> = {
  report_accepted: { label: 'Report accepted', color: 'text-info' },
  privacy_protection_completed: { label: 'Privacy protection completed', color: 'text-success' },
  protected_copy_released: { label: 'Protected copy released', color: 'text-success' },
  investigator_assigned: { label: 'Anti-Corruption Officer assigned', color: 'text-ink-2' },
  status_changed: { label: 'Status changed', color: 'text-ink-2' },
  original_access_requested: { label: 'Original access requested', color: 'text-warning' },
  privacy_review_approved: { label: 'Recommended for approval', color: 'text-success' },
  privacy_review_rejected: { label: 'Privacy review rejected', color: 'text-error' },
  protection_correction_requested: { label: 'Returned for protection correction', color: 'text-warning' },
  access_clarification_requested: { label: 'Clarification requested', color: 'text-warning' },
  access_clarification_answered: { label: 'Clarification provided', color: 'text-info' },
  oversight_approval_granted: { label: 'Oversight approval granted', color: 'text-success' },
  oversight_approval_rejected: { label: 'Oversight approval rejected', color: 'text-error' },
  evidence_opened: { label: 'Evidence opened', color: 'text-ember' },
  access_expired: { label: 'Access expired', color: 'text-ink-muted' },
  access_revoked: { label: 'Access revoked', color: 'text-error' },
  access_ended: { label: 'Access ended', color: 'text-ink-2' },
  closure_recommended: { label: 'Closure recommended', color: 'text-warning' },
  closure_approved: { label: 'Closure approved', color: 'text-success' },
  case_reopened: { label: 'Case reopened', color: 'text-ember' },
  public_update_added: { label: 'Public update added', color: 'text-info' },
  internal_note_added: { label: 'Internal note added', color: 'text-ink-2' },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function AuditTimeline({ events }: AuditTimelineProps) {
  if (events.length === 0) {
    return <p className="text-[14px] text-ink-muted py-8 text-center">No audit events recorded.</p>;
  }

  return (
    <ol className="relative flex flex-col gap-0">
      {events.map((event, i) => {
        const cfg = eventConfig[event.type] ?? { label: event.type, color: 'text-ink-2' };
        return (
          <li key={event.id} className="flex gap-4 relative">
            {i < events.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-rule" />
            )}
            <div className="shrink-0 w-6 h-6 rounded-full border-2 border-surface bg-surface-2 mt-0.5 flex items-center justify-center">
              <div className={`w-2 h-2 rounded-full ${cfg.color.replace('text-', 'bg-')}`} />
            </div>
            <div className="flex-1 pb-6">
              <p className={`text-[14px] font-medium ${cfg.color}`}>{cfg.label}</p>
              {event.actorName && (
                <p className="text-[13px] text-ink-2">{event.actorName}{event.actorRole ? ` · ${event.actorRole}` : ''}</p>
              )}
              {event.purpose && <p className="text-[13px] text-ink-muted">Purpose: {event.purpose}</p>}
              {event.detail && <p className="text-[13px] text-ink-2">{event.detail}</p>}
              <p className="text-[12px] text-ink-muted mt-1 tabular-nums">{formatDateTime(event.occurredAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
