"""Scoped local-demo reset (P02B).

Default scope: seeded fixtures only (complaints with is_seeded=True) and their dependent rows.
`--include-submitted` also removes locally submitted complaints. Refuses RUN_PROFILE=production-like.
Dry-run by default; pass --apply to actually delete. Never drops the schema or unrelated tables.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, select  # noqa: E402

from app.config import get_settings  # noqa: E402
from app.db import SessionLocal  # noqa: E402
from app import models  # noqa: E402


def _dependent_ids(db, complaint_ids: list[str]) -> dict:
    item_ids = [i.id for i in db.scalars(select(models.EvidenceItem).where(models.EvidenceItem.complaint_id.in_(complaint_ids)))]
    version_ids = [v.id for v in db.scalars(select(models.EvidenceVersion).where(models.EvidenceVersion.item_id.in_(item_ids)))] if item_ids else []
    request_ids = [r.id for r in db.scalars(select(models.AccessRequest).where(models.AccessRequest.complaint_id.in_(complaint_ids)))]
    grant_ids = [g.id for g in db.scalars(select(models.AccessGrant).where(models.AccessGrant.complaint_id.in_(complaint_ids)))]
    object_ids = [o.id for o in db.scalars(select(models.UploadObject).where(models.UploadObject.intake_session_id.in_(
        select(models.IntakeSession.id).where(models.IntakeSession.result_reference.in_(
            select(models.Complaint.reference).where(models.Complaint.id.in_(complaint_ids))
        ))
    )))] if complaint_ids else []
    return {
        "item_ids": item_ids,
        "version_ids": version_ids,
        "request_ids": request_ids,
        "grant_ids": grant_ids,
        "object_ids": object_ids,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="actually delete (default: dry run)")
    parser.add_argument("--include-submitted", action="store_true", help="also remove non-seeded complaints")
    args = parser.parse_args()

    s = get_settings()
    if s.is_production_like:
        print("REFUSED: demo reset is disabled under RUN_PROFILE=production-like")
        raise SystemExit(2)
    if not s.demo_reset_enabled:
        print("REFUSED: DEMO_RESET_ENABLED is false")
        raise SystemExit(2)

    db = SessionLocal()
    try:
        q = select(models.Complaint)
        if not args.include_submitted:
            q = q.where(models.Complaint.is_seeded.is_(True))
        complaints = list(db.scalars(q))
        ids = [c.id for c in complaints]
        dep = _dependent_ids(db, ids)
        print(f"scope: {len(ids)} complaint(s); items={len(dep['item_ids'])} "
              f"versions={len(dep['version_ids'])} requests={len(dep['request_ids'])}")
        if not args.apply:
            print("dry run — pass --apply to delete")
            return
        # storage cleanup for unattached objects
        from app.storage import get_storage
        storage = get_storage()
        for obj in db.scalars(select(models.UploadObject).where(models.UploadObject.id.in_(dep["object_ids"]))):
            try:
                storage.delete(obj.storage_path)
            except Exception:
                pass
        db.execute(delete(models.ApprovalDecision).where(models.ApprovalDecision.revision_id.in_(
            select(models.RequestRevision.id).where(models.RequestRevision.request_id.in_(dep["request_ids"] or [""])))))
        db.execute(delete(models.RequestRevision).where(models.RequestRevision.request_id.in_(dep["request_ids"] or [""])))
        db.execute(delete(models.AccessGrant).where(models.AccessGrant.complaint_id.in_(ids or [""])))
        db.execute(delete(models.AccessRequest).where(models.AccessRequest.complaint_id.in_(ids or [""])))
        db.execute(delete(models.ProtectedRelease).where(models.ProtectedRelease.complaint_id.in_(ids or [""])))
        db.execute(delete(models.Assignment).where(models.Assignment.complaint_id.in_(ids or [""])))
        db.execute(delete(models.InspectionResult).where(models.InspectionResult.object_id.in_(dep["object_ids"] or [""])))
        db.execute(delete(models.EvidenceVersion).where(models.EvidenceVersion.item_id.in_(dep["item_ids"] or [""])))
        db.execute(delete(models.EvidenceItem).where(models.EvidenceItem.complaint_id.in_(ids or [""])))
        db.execute(delete(models.TrackingCredential).where(models.TrackingCredential.complaint_id.in_(ids or [""])))
        db.execute(delete(models.ProofRecord).where(models.ProofRecord.complaint_id.in_(ids or [""])))
        db.execute(delete(models.InternalNote).where(models.InternalNote.complaint_id.in_(ids or [""])))
        db.execute(delete(models.PublicUpdate).where(models.PublicUpdate.complaint_id.in_(ids or [""])))
        db.execute(delete(models.ProtectionTask).where(models.ProtectionTask.complaint_id.in_(ids or [""])))
        db.execute(delete(models.ClosureRecommendation).where(models.ClosureRecommendation.complaint_id.in_(ids or [""])))
        db.execute(delete(models.AuditEvent).where(models.AuditEvent.complaint_id.in_(ids or [""])))
        db.execute(delete(models.Notification).where(models.Notification.complaint_id.in_(ids or [""])))
        db.execute(delete(models.UploadObject).where(models.UploadObject.id.in_(dep["object_ids"] or [""])))
        db.execute(delete(models.Complaint).where(models.Complaint.id.in_(ids or [""])))
        db.commit()
        print(f"deleted {len(ids)} complaint(s) and dependent rows")
    finally:
        db.close()


if __name__ == "__main__":
    main()
