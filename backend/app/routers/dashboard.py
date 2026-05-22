from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import (
    Announcement,
    AttendanceRecord,
    DashboardModulePreference,
    LeaveRequest,
    LeaveStatus,
    PolicyAcknowledgement,
    User,
    UserLearningProgress,
    UserRole,
    WfhRequest,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

DEFAULT_MODULES = [
    "profile",
    "attendance",
    "leave",
    "payroll",
    "learning",
    "career",
    "wellness",
    "compliance",
]

DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _overlap(a0: date, a1: date, b0: date, b1: date) -> bool:
    return not (a1 < b0 or b1 < a0)


def _leave_label(leave_type: str, status: LeaveStatus) -> str:
    st = "Pending" if status == LeaveStatus.pending else "Approved"
    return f"{leave_type.replace('_', ' ').title()} · {st}"


@router.get("/planned-absences")
def planned_absences(
    week_start: date | None = Query(None, description="Monday of the visible window (defaults to this week)"),
    days: int = Query(14, ge=7, le=21),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Two-week leave + WFH timeline for you and (as manager/HR) your team."""
    today = date.today()
    if week_start is None:
        week_start = today - timedelta(days=today.weekday())
    window_end = week_start + timedelta(days=days - 1)

    day_headers = []
    for i in range(days):
        d = week_start + timedelta(days=i)
        day_headers.append(
            {
                "date": d.isoformat(),
                "label": f"{DAY_LABELS[d.weekday()]} {d.day}",
                "weekend": d.weekday() >= 5,
                "is_today": d == today,
            }
        )

    if current.role == UserRole.employee:
        people_users = [current]
    elif current.role == UserRole.manager:
        reports = (
            db.query(User)
            .filter(User.manager_id == current.id, User.is_active.is_(True))
            .order_by(User.full_name.asc())
            .all()
        )
        people_users = [current] + [u for u in reports if u.id != current.id]
    else:
        people_users = db.query(User).filter(User.is_active.is_(True)).order_by(User.full_name.asc()).limit(24).all()

    people_out = []
    for u in people_users:
        segments = []
        for lr in (
            db.query(LeaveRequest)
            .filter(
                LeaveRequest.user_id == u.id,
                LeaveRequest.status.in_((LeaveStatus.pending, LeaveStatus.approved)),
            )
            .all()
        ):
            if not _overlap(lr.start_date, lr.end_date, week_start, window_end):
                continue
            seg0 = max(lr.start_date, week_start)
            seg1 = min(lr.end_date, window_end)
            col_start = (seg0 - week_start).days
            col_end = (seg1 - week_start).days
            if lr.status == LeaveStatus.pending:
                tone = "blue"
            else:
                tone = "purple"
            segments.append(
                {
                    "col_start": col_start,
                    "col_end": col_end,
                    "kind": "leave",
                    "label": _leave_label(lr.leave_type, lr.status),
                    "status": lr.status.value,
                    "tone": tone,
                    "request_id": lr.id,
                }
            )
        for wr in (
            db.query(WfhRequest)
            .filter(
                WfhRequest.user_id == u.id,
                WfhRequest.status.in_((LeaveStatus.pending, LeaveStatus.approved)),
            )
            .all()
        ):
            if not _overlap(wr.start_date, wr.end_date, week_start, window_end):
                continue
            seg0 = max(wr.start_date, week_start)
            seg1 = min(wr.end_date, window_end)
            col_start = (seg0 - week_start).days
            col_end = (seg1 - week_start).days
            tone = "blue" if wr.status == LeaveStatus.pending else "green"
            segments.append(
                {
                    "col_start": col_start,
                    "col_end": col_end,
                    "kind": "wfh",
                    "label": f"WFH · {'Pending' if wr.status == LeaveStatus.pending else 'Approved'}",
                    "status": wr.status.value,
                    "tone": tone,
                    "request_id": wr.id,
                }
            )
        people_out.append(
            {
                "user_id": u.id,
                "name": u.full_name,
                "title": u.job_title or "Team member",
                "segments": segments,
            }
        )

    return {"week_start": week_start.isoformat(), "days": days, "day_headers": day_headers, "people": people_out}


@router.get("/summary")
def summary(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    pending_leave = (
        db.query(func.count(LeaveRequest.id))
        .filter(LeaveRequest.user_id == current.id, LeaveRequest.status == LeaveStatus.pending)
        .scalar()
        or 0
    )
    announcements = (
        db.query(Announcement)
        .filter(
            (Announcement.audience_role == "all")
            | (Announcement.audience_role == current.role.value)
        )
        .order_by(Announcement.created_at.desc())
        .limit(5)
        .all()
    )
    today = date.today()
    att = (
        db.query(AttendanceRecord)
        .filter(AttendanceRecord.user_id == current.id, AttendanceRecord.day == today)
        .first()
    )
    return {
        "user": {"id": current.id, "name": current.full_name, "role": current.role.value},
        "pending_leave_requests": int(pending_leave),
        "today_attendance": att.status if att else "not_marked",
        "announcements": [{"id": a.id, "title": a.title} for a in announcements],
    }


@router.get("/modules")
def get_modules(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    prefs = {p.module_key: p.visible for p in db.query(DashboardModulePreference).filter(DashboardModulePreference.user_id == current.id).all()}
    return {"modules": [{"key": k, "visible": prefs.get(k, True)} for k in DEFAULT_MODULES]}


@router.put("/modules")
def set_modules(
    updates: list[dict],
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    for item in updates:
        key = item.get("module_key")
        vis = item.get("visible")
        if key not in DEFAULT_MODULES or not isinstance(vis, bool):
            continue
        row = (
            db.query(DashboardModulePreference)
            .filter(DashboardModulePreference.user_id == current.id, DashboardModulePreference.module_key == key)
            .first()
        )
        if not row:
            row = DashboardModulePreference(user_id=current.id, module_key=key, visible=vis)
            db.add(row)
        else:
            row.visible = vis
    db.commit()
    return {"ok": True}


@router.get("/hr-overview")
def hr_overview(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.hr))):
    total_users = db.query(func.count(User.id)).scalar() or 0
    pending_all = db.query(func.count(LeaveRequest.id)).filter(LeaveRequest.status == LeaveStatus.pending).scalar() or 0
    learning_completed = db.query(func.count(UserLearningProgress.id)).filter(UserLearningProgress.completed.is_(True)).scalar() or 0
    acks = db.query(func.count(PolicyAcknowledgement.id)).scalar() or 0
    return {
        "total_employees": int(total_users),
        "pending_leave_globally": int(pending_all),
        "learning_completions_recorded": int(learning_completed),
        "policy_acknowledgements": int(acks),
    }
