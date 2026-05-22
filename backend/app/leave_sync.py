"""Ensure every active user has earned / casual / sick balance rows (and migrate from legacy annual)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import LeaveBalance, User


def ensure_user_leave_balances(db: Session, user_id: int) -> None:
    has_earned = db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id, LeaveBalance.leave_type == "earned").first()
    if not has_earned:
        annual = db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id, LeaveBalance.leave_type == "annual").first()
        days = float(annual.balance_days) if annual else 12.0
        db.add(LeaveBalance(user_id=user_id, leave_type="earned", balance_days=days))
    if not db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id, LeaveBalance.leave_type == "casual").first():
        db.add(LeaveBalance(user_id=user_id, leave_type="casual", balance_days=7.0))
    if not db.query(LeaveBalance).filter(LeaveBalance.user_id == user_id, LeaveBalance.leave_type == "sick").first():
        db.add(LeaveBalance(user_id=user_id, leave_type="sick", balance_days=10.0))


def sync_all_users_leave_balances(db: Session) -> None:
    for user in db.query(User).filter(User.is_active.is_(True)).all():
        ensure_user_leave_balances(db, user.id)
