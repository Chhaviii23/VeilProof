import type { InvestigationStatus } from '../../types';

interface StatusBadgeProps {
  status: InvestigationStatus | 'approved' | 'declined' | 'pending' | 'locked' | 'confirmed' | 'failed' | 'verified' | 'mismatch';
  className?: string;
}

const configs: Record<string, { label: string; className: string }> = {
  received_securely: { label: 'Received securely', className: 'bg-info-bg text-info' },
  privacy_review: { label: 'Awaiting privacy review', className: 'bg-warning-bg text-warning' },
  assigned_for_investigation: { label: 'Assigned', className: 'bg-info-bg text-info' },
  under_investigation: { label: 'Under investigation', className: 'bg-ember-soft text-ember' },
  additional_review_required: { label: 'Additional review required', className: 'bg-warning-bg text-warning' },
  resolution_prepared: { label: 'Resolution prepared', className: 'bg-success-bg text-success' },
  received: { label: 'Received', className: 'bg-info-bg text-info' },
  under_review: { label: 'Under review', className: 'bg-warning-bg text-warning' },
  investigation_ongoing: { label: 'Investigation ongoing', className: 'bg-ember-soft text-ember' },
  closed: { label: 'Closed', className: 'bg-surface-2 text-ink-2' },
  approved: { label: 'Approved', className: 'bg-success-bg text-success' },
  declined: { label: 'Declined', className: 'bg-error-bg text-error' },
  pending: { label: 'Pending', className: 'bg-warning-bg text-warning' },
  locked: { label: 'Locked', className: 'bg-surface-2 text-ink-muted' },
  confirmed: { label: 'Confirmed', className: 'bg-success-bg text-success' },
  failed: { label: 'Failed', className: 'bg-error-bg text-error' },
  verified: { label: 'Verified', className: 'bg-success-bg text-success' },
  mismatch: { label: 'Mismatch', className: 'bg-error-bg text-error' },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const cfg = configs[status] ?? { label: status, className: 'bg-surface-2 text-ink-2' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[12px] font-medium ${cfg.className} ${className}`}>
      {cfg.label}
    </span>
  );
}
