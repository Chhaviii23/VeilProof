"""Deny-by-default permission helpers.

Role is never inferred from request fields. Case visibility depends on role AND (for
investigators) a current active assignment.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..errors import ForbiddenError as Forbidden
from ..errors import UnauthorizedError as Unauthorized
from ..models import Assignment, Complaint, StaffMembership


def require_role(membership: StaffMembership, *roles: str) -> None:
    if membership.role not in roles:
        raise Forbidden("role not permitted for this operation")


def active_assignment(db: Session, complaint_id: str) -> Assignment | None:
    return db.scalars(
        select(Assignment).where(
            Assignment.complaint_id == complaint_id, Assignment.active.is_(True)
        )
    ).first()


def can_view_case(db: Session, membership: StaffMembership, complaint_id: str) -> bool:
    if membership.role in ("privacy", "oversight"):
        return True
    if membership.role == "investigator":
        assignment = active_assignment(db, complaint_id)
        if assignment and assignment.investigator_principal_id == membership.human_principal_id:
            return True
        # Seeded/demo cases are assigned by stable officer code instead of an
        # Assignment row; keep the same deny-by-default boundary for them.
        complaint = db.get(Complaint, complaint_id)
        return bool(membership.officer_code and complaint and complaint.assigned_officer_code == membership.officer_code)
    return False


def require_case_view(db: Session, membership: StaffMembership, complaint_id: str) -> None:
    if not can_view_case(db, membership, complaint_id):
        raise Forbidden("case not in scope")
