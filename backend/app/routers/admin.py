from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_roles
from app.leave_sync import ensure_user_leave_balances
from app.models import User, UserRole
from app.schemas import UserOut
from app.routers.users import build_user_out
from app.security import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AdminUserPatch(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    department: str | None = None
    manager_id: int | None = None


@router.patch("/users/{user_id}", response_model=UserOut)
def admin_patch_user(
    user_id: int,
    payload: AdminUserPatch,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role is not None:
        try:
            user.role = UserRole(payload.role)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid role")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.department is not None:
        user.department = payload.department
    if payload.manager_id is not None:
        user.manager_id = payload.manager_id
    db.add(user)
    db.commit()
    db.refresh(user)
    return build_user_out(db, user)


class ResetPasswordIn(BaseModel):
    new_password: str


class OnboardUserIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)
    initial_password: str = Field(min_length=6)
    department: str = "General"
    job_title: str = "Employee"
    manager_id: int | None = None


@router.post("/onboard", response_model=UserOut)
def onboard_new_hire(
    payload: OnboardUserIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    """HR: create a new employee WorkHub account with default earned / casual / sick leave balances."""
    norm_email = str(payload.email).strip().lower()
    if db.query(User).filter(User.email == norm_email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.manager_id is not None:
        mgr = db.query(User).filter(User.id == payload.manager_id).first()
        if not mgr:
            raise HTTPException(status_code=400, detail="manager_id not found")
        if mgr.role not in (UserRole.manager, UserRole.hr):
            raise HTTPException(status_code=400, detail="Reporting manager should be a manager or HR account")
    user = User(
        email=norm_email,
        full_name=payload.full_name.strip(),
        hashed_password=get_password_hash(payload.initial_password),
        role=UserRole.employee,
        department=(payload.department or "General").strip() or "General",
        job_title=(payload.job_title or "Employee").strip() or "Employee",
        manager_id=payload.manager_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_user_leave_balances(db, user.id)
    db.commit()
    db.refresh(user)
    return build_user_out(db, user)


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: int,
    body: ResetPasswordIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.hashed_password = get_password_hash(body.new_password)
    db.add(user)
    db.commit()
    return {"ok": True}
