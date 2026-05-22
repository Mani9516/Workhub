from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, EmailStr, Field


class RoleEnum(str, Enum):
    employee = "employee"
    manager = "manager"
    hr = "hr"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginOtpSend(BaseModel):
    email: EmailStr


class LoginOtpSendResponse(BaseModel):
    message: str
    expires_in_seconds: int
    # "email" when SMTP sends the code; "console" when LOGIN_OTP_LOG_TO_CONSOLE is used (dev).
    delivery: str = "email"


class LoginOtpVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6, pattern=r"^\d{6}$")


class TokenPayload(BaseModel):
    sub: str | None = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum = RoleEnum.employee
    department: str = "General"
    job_title: str = "Employee"


class UserCreate(UserBase):
    password: str = Field(min_length=6)


class UserUpdate(BaseModel):
    full_name: str | None = None
    department: str | None = None
    job_title: str | None = None
    skills: str | None = None
    interests: str | None = None
    career_goals: str | None = None
    certifications: str | None = None
    manager_id: int | None = None


class UserOut(UserBase):
    id: int
    manager_id: int | None = None
    is_active: bool = True
    skills: str = ""
    interests: str = ""
    career_goals: str = ""
    certifications: str = ""
    # HR-approved certification titles only (legacy certifications field is cleared in API responses).
    verified_certifications: list[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CertificationEntryOut(BaseModel):
    id: int
    user_id: int
    title: str
    notes: str = ""
    learning_item_id: int | None = None
    status: str
    created_at: datetime
    employee_name: str | None = None
    typical_duration_weeks: int | None = None
    self_progress_pct: int = 0

    class Config:
        from_attributes = True


class CertificationApprovedRow(BaseModel):
    title: str
    typical_duration_weeks: int | None = None


class CertificationRequestIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    notes: str = ""
    learning_item_id: int | None = None
    typical_duration_weeks: int | None = Field(default=None, ge=1, le=520)


class CertificationAssignIn(BaseModel):
    user_id: int
    title: str = Field(min_length=1, max_length=255)
    notes: str = ""
    learning_item_id: int | None = None
    auto_approve: bool = True
    typical_duration_weeks: int | None = Field(default=None, ge=1, le=520)


class CertificationMeResponse(BaseModel):
    approved_titles: list[str]
    approved_items: list[CertificationApprovedRow] = Field(default_factory=list)
    pending: list[CertificationEntryOut]
    progress_verified_pct: int = 0
    # Average of self_progress_pct across pending HR rows (0 if none).
    self_reported_pending_avg_pct: int = 0


class CertificationSelfProgressIn(BaseModel):
    self_progress_pct: int = Field(ge=0, le=100)


class LeaveRequestCreate(BaseModel):
    leave_type: str
    start_date: date
    end_date: date
    reason: str = ""


class LeaveRequestOut(BaseModel):
    id: int
    user_id: int
    leave_type: str
    leave_type_label: str = ""
    requires_hr_approval: bool = False
    start_date: date
    end_date: date
    reason: str
    status: str
    created_at: datetime
    employee_name: str | None = None

    class Config:
        from_attributes = True


class LeaveTypeMeta(BaseModel):
    key: str
    label: str
    uses_balance: bool
    requires_hr_approval: bool


class WfhRequestCreate(BaseModel):
    start_date: date
    end_date: date
    reason: str = Field(default="", min_length=1)


class WfhRequestOut(BaseModel):
    id: int
    user_id: int
    start_date: date
    end_date: date
    reason: str
    status: str
    created_at: datetime
    employee_name: str | None = None

    class Config:
        from_attributes = True


class LeaveBalanceOut(BaseModel):
    leave_type: str
    leave_type_label: str = ""
    balance_days: float

    class Config:
        from_attributes = True


class PolicyOut(BaseModel):
    id: int
    category: str
    title: str
    body: str
    priority: int
    requires_ack: bool

    class Config:
        from_attributes = True


class LearningOut(BaseModel):
    id: int
    title: str
    description: str
    department_tags: str
    skill_tags: str
    duration_hours: float

    class Config:
        from_attributes = True


class LearningWithProgressOut(LearningOut):
    completed: bool = False
    progress_pct: int = 0


class LearningProgressPctIn(BaseModel):
    progress_pct: int = Field(ge=0, le=100)


class HrLearningCourseProgressOut(BaseModel):
    learning_item_id: int
    title: str
    completed: bool
    progress_pct: int = 0


class HrCertPipelineRow(BaseModel):
    title: str
    status: str
    typical_duration_weeks: int | None = None
    self_progress_pct: int = 0


class SkillInsightsOut(BaseModel):
    suggested_certifications: list[str] = Field(default_factory=list)
    open_roles: list[str] = Field(default_factory=list)


class HrLearningUserProgressOut(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    department: str
    job_title: str = "Employee"
    courses_completed: int
    courses_total: int
    courses: list[HrLearningCourseProgressOut] = Field(default_factory=list)
    certifications: list[HrCertPipelineRow] = Field(default_factory=list)
    certification_progress_pct: int = 0
    skill_insights: SkillInsightsOut = Field(default_factory=SkillInsightsOut)


class LearningRecommendation(BaseModel):
    learning_item_id: int
    title: str
    score: float
    explanation: str


class ModulePreferenceIn(BaseModel):
    module_key: str
    visible: bool


class ModulePreferenceOut(BaseModel):
    module_key: str
    visible: bool

    class Config:
        from_attributes = True


class AnnouncementOut(BaseModel):
    id: int
    title: str
    body: str
    audience_role: str
    created_at: datetime

    class Config:
        from_attributes = True


class PayslipOut(BaseModel):
    id: int
    month: str
    gross: float
    net: float
    pdf_url: str

    class Config:
        from_attributes = True


class AttendanceOut(BaseModel):
    day: date
    status: str

    class Config:
        from_attributes = True


class ChatMessageIn(BaseModel):
    message: str


class ChatMessageOut(BaseModel):
    reply: str
    suggestions: list[str] = []
