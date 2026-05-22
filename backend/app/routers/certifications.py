from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import CertificationEntry, CertificationStatus, LearningItem, User, UserRole
from app.schemas import (
    CertificationApprovedRow,
    CertificationAssignIn,
    CertificationEntryOut,
    CertificationMeResponse,
    CertificationRequestIn,
    CertificationSelfProgressIn,
)

router = APIRouter(prefix="/api/certifications", tags=["certifications"])


def approved_titles_for_user(db: Session, user_id: int) -> list[str]:
    rows = (
        db.query(CertificationEntry.title)
        .filter(CertificationEntry.user_id == user_id, CertificationEntry.status == CertificationStatus.approved)
        .order_by(CertificationEntry.title)
        .all()
    )
    return [r[0] for r in rows]


def approved_certifications_blob(db: Session, user_id: int) -> str:
    return " ".join(approved_titles_for_user(db, user_id)).lower()


def _serialize_entry(row: CertificationEntry, db: Session) -> CertificationEntryOut:
    u = db.query(User).filter(User.id == row.user_id).first()
    st = row.status.value if hasattr(row.status, "value") else str(row.status)
    sp = int(getattr(row, "self_progress_pct", 0) or 0)
    sp = max(0, min(100, sp))
    return CertificationEntryOut(
        id=row.id,
        user_id=row.user_id,
        title=row.title,
        notes=row.notes or "",
        learning_item_id=row.learning_item_id,
        status=st,
        created_at=row.created_at,
        employee_name=u.full_name if u else None,
        typical_duration_weeks=getattr(row, "typical_duration_weeks", None),
        self_progress_pct=sp,
    )


def _validate_learning_item(db: Session, learning_item_id: int | None) -> None:
    if learning_item_id is None:
        return
    if not db.query(LearningItem).filter(LearningItem.id == learning_item_id).first():
        raise HTTPException(status_code=400, detail="learning_item_id not found")


@router.get("/me", response_model=CertificationMeResponse)
def my_certifications(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    approved_rows = (
        db.query(CertificationEntry)
        .filter(CertificationEntry.user_id == current.id, CertificationEntry.status == CertificationStatus.approved)
        .order_by(CertificationEntry.title)
        .all()
    )
    approved_items = [
        CertificationApprovedRow(title=r.title, typical_duration_weeks=r.typical_duration_weeks) for r in approved_rows
    ]
    approved_titles = [r.title for r in approved_items]
    pending_rows = (
        db.query(CertificationEntry)
        .filter(CertificationEntry.user_id == current.id, CertificationEntry.status == CertificationStatus.pending_hr)
        .order_by(CertificationEntry.created_at.desc())
        .all()
    )
    n_ap = len(approved_titles)
    n_pe = len(pending_rows)
    progress_verified_pct = int(round(100 * n_ap / (n_ap + n_pe))) if (n_ap + n_pe) > 0 else 0
    self_reported_pending_avg_pct = (
        int(round(sum(int(getattr(r, "self_progress_pct", 0) or 0) for r in pending_rows) / len(pending_rows)))
        if pending_rows
        else 0
    )
    return CertificationMeResponse(
        approved_titles=approved_titles,
        approved_items=approved_items,
        pending=[_serialize_entry(r, db) for r in pending_rows],
        progress_verified_pct=progress_verified_pct,
        self_reported_pending_avg_pct=self_reported_pending_avg_pct,
    )


@router.post("/request", response_model=CertificationEntryOut)
def request_certification(
    payload: CertificationRequestIn,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.employee, UserRole.manager)),
):
    """Employee/manager requests HR verification — not shown as approved until HR approves."""
    _validate_learning_item(db, payload.learning_item_id)
    row = CertificationEntry(
        user_id=current.id,
        title=payload.title.strip(),
        notes=(payload.notes or "").strip(),
        learning_item_id=payload.learning_item_id,
        status=CertificationStatus.pending_hr,
        created_by_id=current.id,
        typical_duration_weeks=payload.typical_duration_weeks,
        self_progress_pct=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_entry(row, db)


@router.patch("/me/entries/{entry_id}/self-progress", response_model=CertificationEntryOut)
def update_my_certification_self_progress(
    entry_id: int,
    body: CertificationSelfProgressIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Update self-reported study progress (0–100) on your own pending certification. Only HR can approve."""
    row = db.query(CertificationEntry).filter(CertificationEntry.id == entry_id).first()
    if not row or row.user_id != current.id:
        raise HTTPException(status_code=404, detail="Entry not found")
    if row.status != CertificationStatus.pending_hr:
        raise HTTPException(status_code=400, detail="Progress can only be updated while awaiting HR review")
    row.self_progress_pct = body.self_progress_pct
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_entry(row, db)


@router.get("/hr/pending", response_model=list[CertificationEntryOut])
def hr_pending_certifications(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.hr))):
    rows = (
        db.query(CertificationEntry)
        .filter(CertificationEntry.status == CertificationStatus.pending_hr)
        .order_by(CertificationEntry.created_at.asc())
        .all()
    )
    return [_serialize_entry(r, db) for r in rows]


@router.post("/hr/assign", response_model=CertificationEntryOut)
def hr_assign_certification(
    payload: CertificationAssignIn,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.hr)),
):
    """HR records or assigns a certification/course link for an employee (optional auto-approve)."""
    target = db.query(User).filter(User.id == payload.user_id).first()
    if not target or not target.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    _validate_learning_item(db, payload.learning_item_id)
    now = datetime.utcnow()
    if payload.auto_approve:
        row = CertificationEntry(
            user_id=payload.user_id,
            title=payload.title.strip(),
            notes=(payload.notes or "").strip(),
            learning_item_id=payload.learning_item_id,
            status=CertificationStatus.approved,
            created_by_id=current.id,
            hr_decided_by_id=current.id,
            decided_at=now,
            typical_duration_weeks=payload.typical_duration_weeks,
            self_progress_pct=100,
        )
    else:
        row = CertificationEntry(
            user_id=payload.user_id,
            title=payload.title.strip(),
            notes=(payload.notes or "").strip(),
            learning_item_id=payload.learning_item_id,
            status=CertificationStatus.pending_hr,
            created_by_id=current.id,
            typical_duration_weeks=payload.typical_duration_weeks,
            self_progress_pct=0,
        )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_entry(row, db)


@router.post("/hr/entries/{entry_id}/approve", response_model=CertificationEntryOut)
def hr_approve_certification(
    entry_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.hr)),
):
    row = db.query(CertificationEntry).filter(CertificationEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Entry not found")
    if row.status != CertificationStatus.pending_hr:
        raise HTTPException(status_code=400, detail="Not pending")
    row.status = CertificationStatus.approved
    row.hr_decided_by_id = current.id
    row.decided_at = datetime.utcnow()
    row.self_progress_pct = 100
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_entry(row, db)


@router.post("/hr/entries/{entry_id}/reject", response_model=CertificationEntryOut)
def hr_reject_certification(
    entry_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.hr)),
):
    row = db.query(CertificationEntry).filter(CertificationEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Entry not found")
    if row.status != CertificationStatus.pending_hr:
        raise HTTPException(status_code=400, detail="Not pending")
    row.status = CertificationStatus.rejected
    row.hr_decided_by_id = current.id
    row.decided_at = datetime.utcnow()
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize_entry(row, db)
