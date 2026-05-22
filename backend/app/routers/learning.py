from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from collections import defaultdict

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import CertificationEntry, CertificationStatus, LearningItem, User, UserLearningProgress, UserRole
from app.skill_insights import build_skill_insights
from app.schemas import (
    HrCertPipelineRow,
    HrLearningCourseProgressOut,
    HrLearningUserProgressOut,
    LearningOut,
    LearningProgressPctIn,
    LearningWithProgressOut,
    SkillInsightsOut,
)

router = APIRouter(prefix="/api/learning", tags=["learning"])


def _target_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _can_view_learning_catalog(actor: User, target: User) -> bool:
    if actor.id == target.id:
        return True
    if actor.role == UserRole.hr:
        return True
    if actor.role == UserRole.manager and target.manager_id == actor.id:
        return True
    return False


def _assert_can_view_learning_catalog(actor: User, target: User) -> None:
    if not _can_view_learning_catalog(actor, target):
        raise HTTPException(status_code=403, detail="Not allowed to view this user's learning")


def _upsert_learning_complete(db: Session, user_id: int, item_id: int) -> None:
    item = db.query(LearningItem).filter(LearningItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")
    row = (
        db.query(UserLearningProgress)
        .filter(UserLearningProgress.user_id == user_id, UserLearningProgress.learning_item_id == item_id)
        .first()
    )
    if not row:
        row = UserLearningProgress(user_id=user_id, learning_item_id=item_id, completed=True, progress_pct=100)
        db.add(row)
    else:
        row.completed = True
        row.progress_pct = 100
    db.commit()


@router.get("/hr/progress-overview", response_model=list[HrLearningUserProgressOut])
def hr_learning_progress_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    """One call: every active user's catalog completion (HR dashboard)."""
    items = db.query(LearningItem).order_by(LearningItem.title).all()
    total = len(items)
    users = db.query(User).filter(User.is_active.is_(True)).order_by(User.full_name).all()
    user_ids = [u.id for u in users]
    prog_by_user: dict[int, dict[int, UserLearningProgress]] = {}
    if user_ids:
        for p in db.query(UserLearningProgress).filter(UserLearningProgress.user_id.in_(user_ids)).all():
            prog_by_user.setdefault(p.user_id, {})[p.learning_item_id] = p

    cert_rows = (
        db.query(CertificationEntry).filter(CertificationEntry.user_id.in_(user_ids)).all() if user_ids else []
    )
    certs_by_user: dict[int, list[CertificationEntry]] = defaultdict(list)
    for row in cert_rows:
        certs_by_user[row.user_id].append(row)

    out: list[HrLearningUserProgressOut] = []
    for u in users:
        pmap = prog_by_user.get(u.id, {})
        courses: list[HrLearningCourseProgressOut] = []
        done = 0
        for it in items:
            pr = pmap.get(it.id)
            c = bool(pr.completed) if pr else False
            pct = int(getattr(pr, "progress_pct", 0) or 0) if pr else 0
            if c:
                pct = 100
            if c:
                done += 1
            courses.append(
                HrLearningCourseProgressOut(learning_item_id=it.id, title=it.title, completed=c, progress_pct=pct)
            )
        role_val = u.role.value if hasattr(u.role, "value") else str(u.role)

        cert_list = certs_by_user.get(u.id, [])
        approved_certs = sorted(
            {e.title for e in cert_list if e.status == CertificationStatus.approved},
        )
        pipeline: list[HrCertPipelineRow] = []
        for e in cert_list:
            if e.status not in (CertificationStatus.approved, CertificationStatus.pending_hr):
                continue
            st = e.status.value if hasattr(e.status, "value") else str(e.status)
            pipeline.append(
                HrCertPipelineRow(
                    title=e.title,
                    status=st,
                    typical_duration_weeks=getattr(e, "typical_duration_weeks", None),
                    self_progress_pct=int(getattr(e, "self_progress_pct", 0) or 0),
                )
            )
        pipeline.sort(key=lambda x: (0 if x.status == "pending_hr" else 1, x.title))
        n_ap = sum(1 for x in pipeline if x.status == "approved")
        n_pe = sum(1 for x in pipeline if x.status == "pending_hr")
        cert_pct = int(round(100 * n_ap / (n_ap + n_pe))) if (n_ap + n_pe) > 0 else 0

        sc, sr = build_skill_insights(u, list(approved_certs))
        skill_insights = SkillInsightsOut(suggested_certifications=sc, open_roles=sr)

        out.append(
            HrLearningUserProgressOut(
                user_id=u.id,
                full_name=u.full_name,
                email=str(u.email),
                role=role_val,
                department=u.department or "",
                job_title=u.job_title or "Employee",
                courses_completed=done,
                courses_total=total,
                courses=courses,
                certifications=pipeline,
                certification_progress_pct=cert_pct,
                skill_insights=skill_insights,
            )
        )
    return out


@router.get("/catalog", response_model=list[LearningOut])
def catalog(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(LearningItem).all()


@router.get("/catalog-with-progress", response_model=list[LearningWithProgressOut])
def catalog_with_progress(
    user_id: int | None = Query(None, description="View another user's progress (HR or manager of user)."),
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    target_id = user_id if user_id is not None else current.id
    target = _target_user(db, target_id)
    _assert_can_view_learning_catalog(current, target)
    rows = db.query(UserLearningProgress).filter(UserLearningProgress.user_id == target_id).all()
    by_item = {r.learning_item_id: r for r in rows}
    out: list[LearningWithProgressOut] = []
    for item in db.query(LearningItem).all():
        pr = by_item.get(item.id)
        comp = bool(pr.completed) if pr else False
        pct = int(getattr(pr, "progress_pct", 0) or 0) if pr else 0
        if comp:
            pct = 100
        out.append(
            LearningWithProgressOut(
                id=item.id,
                title=item.title,
                description=item.description,
                department_tags=item.department_tags,
                skill_tags=item.skill_tags,
                duration_hours=item.duration_hours,
                completed=comp,
                progress_pct=pct,
            )
        )
    return out


@router.get("/my-progress")
def my_progress(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    rows = db.query(UserLearningProgress).filter(UserLearningProgress.user_id == current.id).all()
    items = {i.id: i for i in db.query(LearningItem).all()}
    return [
        {
            "learning_item_id": r.learning_item_id,
            "title": items.get(r.learning_item_id).title if items.get(r.learning_item_id) else "",
            "completed": r.completed,
            "progress_pct": int(getattr(r, "progress_pct", 0) or 0),
        }
        for r in rows
    ]


@router.get("/users/{user_id}/progress")
def user_progress(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    target = _target_user(db, user_id)
    _assert_can_view_learning_catalog(current, target)
    rows = db.query(UserLearningProgress).filter(UserLearningProgress.user_id == user_id).all()
    items = {i.id: i for i in db.query(LearningItem).all()}
    return [
        {
            "learning_item_id": r.learning_item_id,
            "title": items.get(r.learning_item_id).title if items.get(r.learning_item_id) else "",
            "completed": r.completed,
            "progress_pct": int(getattr(r, "progress_pct", 0) or 0),
        }
        for r in rows
    ]


@router.patch("/progress/{item_id}", response_model=LearningWithProgressOut)
def patch_my_learning_progress_pct(
    item_id: int,
    body: LearningProgressPctIn,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Set your own catalog course progress (0–100). Only HR can mark a course complete."""
    item = db.query(LearningItem).filter(LearningItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Course not found")
    row = (
        db.query(UserLearningProgress)
        .filter(UserLearningProgress.user_id == current.id, UserLearningProgress.learning_item_id == item_id)
        .first()
    )
    if row and row.completed:
        raise HTTPException(status_code=400, detail="This course is already marked complete by HR")
    if not row:
        row = UserLearningProgress(
            user_id=current.id,
            learning_item_id=item_id,
            completed=False,
            progress_pct=body.progress_pct,
        )
        db.add(row)
    else:
        row.progress_pct = body.progress_pct
    db.commit()
    db.refresh(row)
    pct = int(row.progress_pct or 0)
    return LearningWithProgressOut(
        id=item.id,
        title=item.title,
        description=item.description,
        department_tags=item.department_tags,
        skill_tags=item.skill_tags,
        duration_hours=item.duration_hours,
        completed=bool(row.completed),
        progress_pct=100 if row.completed else pct,
    )


@router.post("/users/{user_id}/progress/{item_id}/complete")
def mark_user_learning_complete(
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    if current.role != UserRole.hr:
        raise HTTPException(status_code=403, detail="Only HR can mark catalog courses complete")
    _target_user(db, user_id)
    _upsert_learning_complete(db, user_id, item_id)
    return {"ok": True}


@router.post("/progress/{item_id}/complete")
def mark_complete(item_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """HR only: mark the signed-in user's course complete (legacy path)."""
    if current.role != UserRole.hr:
        raise HTTPException(status_code=403, detail="Only HR can mark catalog courses complete")
    _upsert_learning_complete(db, current.id, item_id)
    return {"ok": True}


@router.post("/items", response_model=LearningOut)
def create_item(
    title: str,
    description: str = "",
    department_tags: str = "",
    skill_tags: str = "",
    duration_hours: float = 1.0,
    mandatory_for_roles: str = "",
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    row = LearningItem(
        title=title,
        description=description,
        department_tags=department_tags,
        skill_tags=skill_tags,
        duration_hours=duration_hours,
        mandatory_for_roles=mandatory_for_roles,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row
