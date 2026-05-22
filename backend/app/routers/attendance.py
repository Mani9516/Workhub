from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import AttendanceRecord, User
from app.schemas import AttendanceOut

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


@router.get("/me", response_model=list[AttendanceOut])
def my_attendance(
    days: int = 30,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    end = date.today()
    start = end - timedelta(days=days)
    rows = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == current.id, AttendanceRecord.day >= start, AttendanceRecord.day <= end)
        .order_by(AttendanceRecord.day.desc())
        .all()
    )
    return [AttendanceOut(day=r.day, status=r.status) for r in rows]


@router.post("/checkin")
def checkin(status: str = "present", db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    today = date.today()
    row = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == current.id, AttendanceRecord.day == today)
        .first()
    )
    if not row:
        row = AttendanceRecord(user_id=current.id, day=today, status=status)
        db.add(row)
    else:
        row.status = status
    db.commit()
    return {"ok": True, "day": str(today), "status": status}
