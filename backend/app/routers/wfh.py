from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import LeaveStatus, User, UserRole, WfhRequest
from app.schemas import WfhRequestCreate, WfhRequestOut

router = APIRouter(prefix="/api/wfh", tags=["wfh"])


def _serialize_wfh(req: WfhRequest, db: Session) -> WfhRequestOut:
    u = db.query(User).filter(User.id == req.user_id).first()
    st = req.status.value if hasattr(req.status, "value") else str(req.status)
    return WfhRequestOut(
        id=req.id,
        user_id=req.user_id,
        start_date=req.start_date,
        end_date=req.end_date,
        reason=req.reason or "",
        status=st,
        created_at=req.created_at,
        employee_name=u.full_name if u else None,
    )


@router.get("/requests", response_model=list[WfhRequestOut])
def my_wfh_requests(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(WfhRequest).filter(WfhRequest.user_id == current.id).order_by(WfhRequest.created_at.desc()).all()
    return [_serialize_wfh(r, db) for r in rows]


@router.post("/requests", response_model=WfhRequestOut)
def submit_wfh(payload: WfhRequestCreate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="End date must be on or after start date")
    req = WfhRequest(
        user_id=current.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status=LeaveStatus.pending,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return _serialize_wfh(req, db)


@router.get("/team-requests", response_model=list[WfhRequestOut])
def team_wfh_requests(db: Session = Depends(get_db), current: User = Depends(require_roles(UserRole.manager, UserRole.hr))):
    q = db.query(WfhRequest).join(User, WfhRequest.user_id == User.id)
    if current.role == UserRole.manager:
        q = q.filter(User.manager_id == current.id)
    rows = q.filter(WfhRequest.status == LeaveStatus.pending).order_by(WfhRequest.created_at.asc()).all()
    return [_serialize_wfh(r, db) for r in rows]


@router.post("/requests/{request_id}/decision")
def decide_wfh(
    request_id: int,
    decision: str,
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.manager, UserRole.hr)),
):
    if decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be approved or rejected")
    req = db.query(WfhRequest).filter(WfhRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Request not found")
    employee = db.query(User).filter(User.id == req.user_id).first()
    if current.role == UserRole.manager and (not employee or employee.manager_id != current.id):
        raise HTTPException(status_code=403, detail="Not your direct report")
    if req.status != LeaveStatus.pending:
        raise HTTPException(status_code=400, detail="Already decided")
    req.status = LeaveStatus.approved if decision == "approved" else LeaveStatus.rejected
    req.decided_by_id = current.id
    db.add(req)
    db.commit()
    return {"ok": True, "status": req.status.value}
