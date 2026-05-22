from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, require_roles
from app.models import Policy, PolicyAcknowledgement, User, UserRole
from app.schemas import PolicyOut

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


@router.get("/policies", response_model=list[PolicyOut])
def list_policies(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Policy).order_by(Policy.priority.desc(), Policy.id.asc()).all()


@router.post("/policies", response_model=PolicyOut)
def create_policy(
    category: str,
    title: str,
    body: str,
    priority: int = 0,
    requires_ack: bool = True,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.hr)),
):
    p = Policy(category=category, title=title, body=body, priority=priority, requires_ack=requires_ack)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.post("/policies/{policy_id}/ack")
def acknowledge(policy_id: int, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    pol = db.query(Policy).filter(Policy.id == policy_id).first()
    if not pol:
        raise HTTPException(status_code=404, detail="Policy not found")
    exists = (
        db.query(PolicyAcknowledgement)
        .filter(PolicyAcknowledgement.user_id == current.id, PolicyAcknowledgement.policy_id == policy_id)
        .first()
    )
    if exists:
        return {"ok": True, "already": True}
    db.add(PolicyAcknowledgement(user_id=current.id, policy_id=policy_id))
    db.commit()
    return {"ok": True}
