from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import not_
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.leave_types import (
    ALLOWED_LEAVE_TYPES,
    HR_ONLY_APPROVAL_TYPES,
    hr_only_approval,
    leave_type_label,
    uses_balance,
)
from app.models import LeaveBalance, LeaveRequest, LeaveStatus, User, UserRole
from app.schemas import LeaveBalanceOut, LeaveRequestCreate, LeaveRequestOut, LeaveTypeMeta

router = APIRouter(prefix="/api/leave", tags=["leave"])


def _serialize_leave(req: LeaveRequest, db: Session) -> LeaveRequestOut:
    u = db.query(User).filter(User.id == req.user_id).first()
    st = req.status.value if hasattr(req.status, "value") else str(req.status)
    lt = req.leave_type
    return LeaveRequestOut(
        id=req.id,
        user_id=req.user_id,
        leave_type=lt,
        leave_type_label=leave_type_label(lt),
        requires_hr_approval=hr_only_approval(lt),
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason or "",
        status=st,
        created_at=req.created_at,
        employee_name=u.full_name if u else None,
    )


def _business_days(start: date, end: date) -> float:
    if end < start:
        return 0.0
    days = 0
    d = start
    while d <= end:
        if d.weekday() < 5:
            days += 1
        d = date.fromordinal(d.toordinal() + 1)
    return float(days)


@router.get("/types", response_model=list[LeaveTypeMeta])
def leave_types_catalog(_: User = Depends(get_current_user)):
    """All leave kinds employees may request; bereavement & optional are HR-approved only and do not use balances."""
    out: list[LeaveTypeMeta] = []
    for key in sorted(ALLOWED_LEAVE_TYPES):
        out.append(
            LeaveTypeMeta(
                key=key,
                label=leave_type_label(key),
                uses_balance=uses_balance(key),
                requires_hr_approval=hr_only_approval(key),
            )
        )
    return out


@router.get("/balance", response_model=list[LeaveBalanceOut])
def balances(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(LeaveBalance).filter(LeaveBalance.user_id == current.id).all()
    return [
        LeaveBalanceOut(
            leave_type=r.leave_type,
            leave_type_label=leave_type_label(r.leave_type),
            balance_days=r.balance_days,
        )
        for r in rows
    ]


@router.get("/requests", response_model=list[LeaveRequestOut])
def my_requests(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = (
        db.query(LeaveRequest)
        .filter(LeaveRequest.user_id == current.id)
        .order_by(LeaveRequest.created_at.desc())
        .all()
    )
    return [_serialize_leave(r, db) for r in rows]


@router.post("/requests", response_model=LeaveRequestOut)
def apply_leave(payload: LeaveRequestCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    lt = payload.leave_type.strip().lower()
    if lt not in ALLOWED_LEAVE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid leave type")
    days = _business_days(payload.start_date, payload.end_date)
    if days <= 0:
        raise HTTPException(status_code=400, detail="Invalid date range")
    if uses_balance(lt):
        bal = (
            db.query(LeaveBalance)
            .filter(LeaveBalance.user_id == current.id, LeaveBalance.leave_type == lt)
            .first()
        )
        if not bal:
            raise HTTPException(status_code=400, detail="No leave balance for this type — contact HR")
        if bal.balance_days < days:
            raise HTTPException(status_code=400, detail="Insufficient leave balance")
    req = LeaveRequest(
        user_id=current.id,
        leave_type=lt,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason,
        status=LeaveStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize_leave(req, db)


@router.get("/team-requests", response_model=list[LeaveRequestOut])
def team_requests(db: Session = Depends(get_db), current: User = Depends(require_roles(UserRole.manager, UserRole.hr))):
    q = (
        db.query(LeaveRequest)
        .join(User, LeaveRequest.user_id == User.id)
        .filter(LeaveRequest.status == LeaveStatus.pending)
    )
    if current.role == UserRole.manager:
        q = q.filter(User.manager_id == current.id, not_(LeaveRequest.leave_type.in_(HR_ONLY_APPROVAL_TYPES)))
    rows = q.order_by(LeaveRequest.created_at.asc()).all()
    return [_serialize_leave(r, db) for r in rows]


@router.post("/requests/{request_id}/decision")
def decide_leave(
    request_id: int,
    decision: str,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.manager, UserRole.hr)),
):
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be approved or rejected")
    req = db.query(LeaveRequest).filter(LeaveRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    employee = db.query(User).filter(User.id == req.user_id).first()
    if current.role == UserRole.manager:
        if not employee or employee.manager_id != current.id:
            raise HTTPException(status_code=403, detail="Not your direct report")
        if req.leave_type in HR_ONLY_APPROVAL_TYPES:
            raise HTTPException(status_code=403, detail="Bereavement and optional leave are approved by HR only")
    if req.status != LeaveStatus.pending:
        raise HTTPException(status_code=400, detail="Already decided")
    days = _business_days(req.start_date, req.end_date)
    if decision == "approved":
        if uses_balance(req.leave_type):
            bal = (
                db.query(LeaveBalance)
                .filter(LeaveBalance.user_id == req.user_id, LeaveBalance.leave_type == req.leave_type)
                .first()
            )
            if bal:
                if bal.balance_days < days:
                    raise HTTPException(status_code=400, detail="Insufficient balance at approval time")
                bal.balance_days -= days
        req.status = LeaveStatus.approved
    else:
        req.status = LeaveStatus.rejected
    req.decided_by_id = current.id
    db.add(req)
    db.commit()
    return {"ok": True, "status": req.status.value}
