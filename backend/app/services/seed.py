"""Reproducible fictional-data seed (P02B).

Idempotent by case reference and auth subject. Seeds one fictional operator, four staff
memberships (including a test-only shared-principal account), and three baseline sample cases.
The canonical bridge case reference `VP-2026-1048` is reserved and NOT seeded.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import (
    AuditEvent,
    Complaint,
    EvidenceItem,
    Operator,
    PublicUpdate,
    StaffMembership,
    TrackingCredential,
)
from ..security import auth, tracking
from ..timeutil import utcnow

OPERATOR_NAME = "Public Integrity Office (fictional)"
RESERVED_REFERENCE = "VP-2026-1048"

STAFF = [
    {"subject": "arjun.mehta", "password": "demo-inv", "name": "Arjun Mehta", "role": "investigator", "hp": "arjun", "officer": "ACO-04"},
    {"subject": "priya.nair", "password": "demo-priv", "name": "Priya Nair", "role": "privacy", "hp": "priya", "officer": None},
    {"subject": "meera.rao", "password": "demo-over", "name": "Meera Rao", "role": "oversight", "hp": "meera", "officer": None},
    # Test-only: same human principal as meera, different role — used to prove independence.
    {"subject": "meera.dual", "password": "demo-dual", "name": "Meera Rao (dual account)", "role": "privacy", "hp": "meera", "officer": None},
    # Test-only: oversight account sharing a principal with the Privacy reviewer.
    {"subject": "priya.dup", "password": "demo-dup", "name": "Priya Nair (dual account)", "role": "oversight", "hp": "priya", "officer": None},
]

SEED_TRACKING = {
    "VP-SEED-0001": "TRK-E9F2-8C3A-1B7D",
    "VP-SEED-0002": "TRK-A4B8-2D1C-9E5F",
    "VP-SEED-0003": "TRK-7F3E-5A9B-2C4D",
}


def _ev(mime, size, removed, protected, sealed, released=None, released_by=None):
    """Return the seeded display metadata for one object-less evidence item."""
    return {
        "type": mime,
        "size": size,
        "metadata_removed": removed,
        "protectedCopyStatus": protected,
        "sealedOriginalStatus": sealed,
        "protectedCopyReleasedAt": released,
        "protectedCopyReleasedByName": released_by,
    }


def seed_all(db: Session) -> dict:
    op = db.scalars(select(Operator).where(Operator.name == OPERATOR_NAME)).first()
    if op is None:
        op = Operator(name=OPERATOR_NAME, active=True)
        db.add(op)
        db.flush()

    for s in STAFF:
        existing = db.scalars(
            select(StaffMembership).where(StaffMembership.auth_subject == s["subject"])
        ).first()
        if existing:
            continue
        db.add(
            StaffMembership(
                operator_id=op.id,
                auth_subject=s["subject"],
                human_principal_id=s["hp"],
                display_name=s["name"],
                role=s["role"],
                officer_code=s["officer"],
                password_hash=auth.hash_password(s["password"]),
            )
        )
    db.flush()

    created = _seed_case_001(db, op.id)
    created += _seed_case_002(db, op.id)
    created += _seed_case_003(db, op.id)
    db.flush()
    return {"operator_id": op.id, "cases_created": created}


def _seed_case_001(db: Session, operator_id: str) -> int:
    ref = "VP-SEED-0001"
    if db.scalars(select(Complaint).where(Complaint.reference == ref)).first():
        return 0
    c = Complaint(
        reference=ref,
        operator_id=operator_id,
        lifecycle="privacy_review",
        priority="standard",
        title="Municipal Road-Contract Billing Irregularity",
        description=(
            "Submission concerns alleged billing irregularities on a municipal road-resurfacing "
            "contract. Invoices appear to claim payment for work that site inspections indicate "
            "was not completed.\n\nFictional demonstration case — all names and figures are invented."
        ),
        category="financial_misconduct",
        incident_date="2026-07-01",
        location="North Municipal Ward — Fictional Location",
        involved_parties="Municipal Works Division (fictional), Greenfield Road Services Ltd. (fictional)",
        risk_factors=["workplace_retaliation"],
        is_seeded=True,
    )
    db.add(c)
    db.flush()
    db.add_all(
        [
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("application/pdf", 1_860_000, ["Author", "Organization", "EditingHistory", "FilePath"], "pending_release", "sealed"), display_label="Road_Contract_Billing_Summary.pdf", category="document"),
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("image/jpeg", 2_940_000, ["GPS coordinates", "Device model", "Capture timestamp"], "pending_release", "sealed"), display_label="Site_Completion_Photo_01.jpg", category="image"),
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("link", 0, ["Referrer", "Session identifiers"], "pending_release", "sealed"), display_label="Fictional Tender Portal Reference", category="reference"),
        ]
    )
    _seed_tracking(db, c.id, ref)
    _seed_public(db, c.id, "received_securely", "Your report has been received securely. Identity protection processing is underway.", "2026-08-04T11:15:00Z")
    _seed_audit(db, c.id, 1, "report_accepted", "Report received securely — VP-SEED-0001", "2026-08-04T11:15:00Z")
    return 1


def _seed_case_002(db: Session, operator_id: str) -> int:
    ref = "VP-SEED-0002"
    if db.scalars(select(Complaint).where(Complaint.reference == ref)).first():
        return 0
    c = Complaint(
        reference=ref,
        operator_id=operator_id,
        lifecycle="under_investigation",
        priority="standard",
        title="Government Hospital Equipment Procurement Concern",
        description=(
            "Submission concerns alleged irregularities in procurement of diagnostic equipment for "
            "a district government hospital. Multiple supplier quotes appear to reference the same "
            "supplier under different names.\n\nFictional demonstration case."
        ),
        category="corruption",
        incident_date="2026-05-01",
        location="District General Hospital — Fictional Location",
        involved_parties="District Health Authority (fictional), MediSupply Co. (fictional)",
        risk_factors=["job_threat"],
        assigned_officer_code="ACO-04",
        is_seeded=True,
    )
    db.add(c)
    db.flush()
    db.add_all(
        [
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("application/pdf", 4_100_000, ["Author", "Organization", "EditingHistory"], "released", "sealed", "2026-06-12T10:00:00Z", "Priya Nair"), display_label="Equipment_Procurement_Quotes.pdf", category="document"),
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("image/jpeg", 3_400_000, ["GPS coordinates", "Camera model", "Capture timestamp"], "released", "sealed", "2026-06-12T10:10:00Z", "Priya Nair"), display_label="Equipment_Store_Inspection.jpg", category="image"),
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("link", 0, ["Referrer", "Session identifiers"], "released", "sealed", "2026-06-12T10:12:00Z", "Priya Nair"), display_label="Fictional Supplier Portal Reference", category="reference"),
        ]
    )
    _seed_tracking(db, c.id, ref)
    _seed_public(db, c.id, "under_investigation", "An anti-corruption investigator has been assigned and is reviewing the submitted materials.", "2026-06-13T10:00:00Z")
    _seed_audit(db, c.id, 1, "report_accepted", "Report received securely — VP-SEED-0002", "2026-06-10T09:30:00Z")
    return 1


def _seed_case_003(db: Session, operator_id: str) -> int:
    ref = "VP-SEED-0003"
    if db.scalars(select(Complaint).where(Complaint.reference == ref)).first():
        return 0
    c = Complaint(
        reference=ref,
        operator_id=operator_id,
        lifecycle="closed",
        priority="standard",
        title="Public Housing Allocation Manipulation",
        description=(
            "Submission alleges that housing units in a public scheme were allocated to ineligible "
            "applicants in exchange for payments and that allocation minutes were backdated. "
            "Findings were referred to the appropriate authority.\n\nFictional demonstration case."
        ),
        category="corruption",
        incident_date="2026-02-01",
        location="Shantinagar Housing Scheme — Fictional Location",
        involved_parties="Housing Authority (fictional), Allocation Committee (fictional)",
        risk_factors=["no_risk"],
        assigned_officer_code="ACO-04",
        closed=True,
        is_seeded=True,
    )
    db.add(c)
    db.flush()
    db.add_all(
        [
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("application/pdf", 1_640_000, ["Author", "EditingHistory"], "released", "ended", "2026-03-09T09:30:00Z", "Priya Nair"), display_label="Allocation_Committee_Minutes.pdf", category="document"),
            EvidenceItem(complaint_id=c.id, seeded_meta=_ev("link", 0, ["Referrer", "Session identifiers"], "released", "sealed", "2026-03-09T09:35:00Z", "Priya Nair"), display_label="Fictional Housing Register Reference", category="reference"),
        ]
    )
    _seed_tracking(db, c.id, ref)
    _seed_public(db, c.id, "closed", "This matter has been reviewed and findings referred to the appropriate authority. Thank you for your report.", "2026-05-20T12:00:00Z")
    _seed_audit(db, c.id, 1, "report_accepted", "Report received securely — VP-SEED-0003", "2026-03-05T08:45:00Z")
    return 1


def _seed_tracking(db: Session, complaint_id: str, ref: str) -> None:
    secret = SEED_TRACKING[ref]
    db.add(
        TrackingCredential(
            complaint_id=complaint_id,
            verifier=tracking.verifier_for(secret),
            pepper_version=tracking.PEPPER_VERSION,
        )
    )


def _seed_public(db: Session, complaint_id: str, status: str, text: str, when: str) -> None:
    from datetime import datetime

    db.add(
        PublicUpdate(
            complaint_id=complaint_id,
            status=status,
            text=text,
            created_at=datetime.fromisoformat(when.replace("Z", "+00:00")),
        )
    )


def _seed_audit(db: Session, complaint_id: str, seq: int, etype: str, detail: str, when: str) -> None:
    import hashlib
    from datetime import datetime

    created = datetime.fromisoformat(when.replace("Z", "+00:00"))
    canonical = f"{complaint_id}|{seq}|{etype}|||||{detail}|{when}"
    db.add(
        AuditEvent(
            complaint_id=complaint_id,
            sequence=seq,
            event_type=etype,
            detail=detail,
            prev_hash=None,
            event_hash=hashlib.sha256(canonical.encode()).hexdigest(),
            created_at=created,
        )
    )
