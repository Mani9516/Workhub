from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import CertificationEntry, CertificationStatus, User, UserRole
from app.schemas import UserOut, UserUpdate

router = APIRouter(prefix="/api/users", tags=["users"])


def _approved_cert_map(db: Session, user_ids: list[int]) -> dict[int, list[str]]:
    if not user_ids:
        return {}
    rows = (
        db.query(CertificationEntry.user_id, CertificationEntry.title)
        .filter(
            CertificationEntry.user_id.in_(user_ids),
            CertificationEntry.status == CertificationStatus.approved,
        )
        .all()
    )
    m: dict[int, list[str]] = defaultdict(list)
    for uid, title in rows:
        m[uid].append(title)
    for uid in m:
        m[uid].sort()
    return dict(m)


def build_user_out(db: Session, user: User) -> UserOut:
    titles = _approved_cert_map(db, [user.id]).get(user.id, [])
    base = UserOut.model_validate(user)
    return base.model_copy(update={"verified_certifications": titles, "certifications": ""})


@router.get("/me", response_model=UserOut)
def read_me(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return build_user_out(db, current)


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    data = payload.model_dump(exclude_unset=True)
    if "certifications" in data and current.role != UserRole.hr:
        del data["certifications"]
    for k, v in data.items():
        setattr(current, k, v)
    db.add(current)
    db.commit()
    db.refresh(current)
    return build_user_out(db, current)


@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current: User = Depends(require_roles(UserRole.hr, UserRole.manager)),
):
    q = db.query(User).filter(User.is_active.is_(True))
    if current.role == UserRole.manager:
        q = q.filter(User.manager_id == current.id)
    users_list = q.all()
    ids = [u.id for u in users_list]
    m = _approved_cert_map(db, ids)
    return [
        UserOut.model_validate(u).model_copy(update={"verified_certifications": m.get(u.id, []), "certifications": ""})
        for u in users_list
    ]


@router.get("/{user_id}", response_model=UserOut)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current.role == UserRole.employee and current.id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed")
    if current.role == UserRole.manager and current.id != user_id and user.manager_id != current.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return build_user_out(db, user)
