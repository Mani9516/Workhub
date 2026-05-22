import enum
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    employee = "employee"
    manager = "manager"
    hr = "hr"


class LeaveStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.employee, nullable=False)
    department: Mapped[str] = mapped_column(String(120), default="General")
    job_title: Mapped[str] = mapped_column(String(120), default="Employee")
    skills: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    interests: Mapped[str] = mapped_column(Text, default="")
    career_goals: Mapped[str] = mapped_column(Text, default="")
    certifications: Mapped[str] = mapped_column(Text, default="")
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    manager = relationship("User", remote_side=[id], foreign_keys=[manager_id])
    leave_requests = relationship("LeaveRequest", back_populates="user", foreign_keys="LeaveRequest.user_id")
    wfh_requests = relationship("WfhRequest", back_populates="user", foreign_keys="WfhRequest.user_id")
    balances = relationship("LeaveBalance", back_populates="user")
    certification_entries = relationship(
        "CertificationEntry", back_populates="user", foreign_keys="CertificationEntry.user_id"
    )


class CertificationStatus(str, enum.Enum):
    pending_hr = "pending_hr"
    approved = "approved"
    rejected = "rejected"


class CertificationEntry(Base):
    __tablename__ = "certification_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    learning_item_id: Mapped[int | None] = mapped_column(ForeignKey("learning_items.id"), nullable=True)
    status: Mapped[CertificationStatus] = mapped_column(
        Enum(CertificationStatus), default=CertificationStatus.pending_hr, nullable=False
    )
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    hr_decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # Estimated calendar time to earn or complete the credential (HR/employee context); optional.
    typical_duration_weeks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Employee/manager self-reported study progress (0–100) while HR review is pending; HR approval is separate.
    self_progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user = relationship("User", back_populates="certification_entries", foreign_keys=[user_id])


class LeaveBalance(Base):
    __tablename__ = "leave_balances"
    __table_args__ = (UniqueConstraint("user_id", "leave_type", name="uq_user_leave_type"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(64), nullable=False)
    balance_days: Mapped[float] = mapped_column(Float, default=0.0)

    user = relationship("User", back_populates="balances")


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    leave_type: Mapped[str] = mapped_column(String(64), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[LeaveStatus] = mapped_column(Enum(LeaveStatus), default=LeaveStatus.pending)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="leave_requests", foreign_keys=[user_id])


class LoginOtpChallenge(Base):
    __tablename__ = "login_otp_challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WfhRequest(Base):
    __tablename__ = "wfh_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[LeaveStatus] = mapped_column(Enum(LeaveStatus), default=LeaveStatus.pending)
    decided_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="wfh_requests", foreign_keys=[user_id])


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)  # hr, ai, it, finance
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0)
    requires_ack: Mapped[bool] = mapped_column(Boolean, default=True)


class PolicyAcknowledgement(Base):
    __tablename__ = "policy_acknowledgements"
    __table_args__ = (UniqueConstraint("user_id", "policy_id", name="uq_user_policy_ack"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    policy_id: Mapped[int] = mapped_column(ForeignKey("policies.id"), nullable=False)
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LearningItem(Base):
    __tablename__ = "learning_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    department_tags: Mapped[str] = mapped_column(String(255), default="")  # comma-separated
    skill_tags: Mapped[str] = mapped_column(String(255), default="")
    duration_hours: Mapped[float] = mapped_column(Float, default=1.0)
    mandatory_for_roles: Mapped[str] = mapped_column(String(255), default="")


class UserLearningProgress(Base):
    __tablename__ = "user_learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "learning_item_id", name="uq_user_learning"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    learning_item_id: Mapped[int] = mapped_column(ForeignKey("learning_items.id"), nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    # Self-reported catalog progress (0–100). Only HR can set completed=true via the learning API.
    progress_pct: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class DashboardModulePreference(Base):
    __tablename__ = "dashboard_module_preferences"
    __table_args__ = (UniqueConstraint("user_id", "module_key", name="uq_user_module"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    module_key: Mapped[str] = mapped_column(String(64), nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, default="")
    audience_role: Mapped[str] = mapped_column(String(32), default="all")  # all, employee, manager, hr
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Payslip(Base):
    __tablename__ = "payslips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    month: Mapped[str] = mapped_column(String(32), nullable=False)
    gross: Mapped[float] = mapped_column(Float, default=0.0)
    net: Mapped[float] = mapped_column(Float, default=0.0)
    pdf_url: Mapped[str] = mapped_column(String(512), default="")


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    day: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="present")  # present, absent, wfh, leave
