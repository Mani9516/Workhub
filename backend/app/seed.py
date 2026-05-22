from datetime import date

from app.database import SessionLocal
from app.models import (
    Announcement,
    AttendanceRecord,
    LearningItem,
    LeaveBalance,
    Payslip,
    Policy,
    User,
    UserRole,
)
from app.security import get_password_hash


def seed_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(User).first():
            return

        hr = User(
            email="hr@workhub.demo",
            full_name="Alex Rivers",
            hashed_password=get_password_hash("demo1234"),
            role=UserRole.hr,
            department="Human Resources",
            job_title="HR Business Partner",
            skills="talent management, compliance, analytics",
            interests="mentoring, leadership",
            career_goals="CHRO",
            certifications="",
        )
        mgr = User(
            email="manager@workhub.demo",
            full_name="Jordan Lee",
            hashed_password=get_password_hash("demo1234"),
            role=UserRole.manager,
            department="Engineering",
            job_title="Engineering Manager",
            skills="python, system design, people management",
            interests="platform reliability",
            career_goals="Director of Engineering",
            certifications="",
        )
        emp = User(
            email="employee@workhub.demo",
            full_name="Sam Patel",
            hashed_password=get_password_hash("demo1234"),
            role=UserRole.employee,
            department="Engineering",
            job_title="Software Engineer",
            skills="react, fastapi, docker, sql",
            interests="developer experience, accessibility",
            career_goals="Senior engineer focusing on platform",
            certifications="",
        )
        db.add_all([hr, mgr, emp])
        db.commit()
        db.refresh(hr)
        db.refresh(mgr)
        db.refresh(emp)
        emp.manager_id = mgr.id
        db.add(emp)
        db.commit()

        uid = emp.id
        db.add_all(
            [
                LeaveBalance(user_id=uid, leave_type="earned", balance_days=12.0),
                LeaveBalance(user_id=uid, leave_type="casual", balance_days=7.0),
                LeaveBalance(user_id=uid, leave_type="sick", balance_days=10.0),
                LeaveBalance(user_id=mgr.id, leave_type="earned", balance_days=15.0),
                LeaveBalance(user_id=mgr.id, leave_type="casual", balance_days=8.0),
                LeaveBalance(user_id=mgr.id, leave_type="sick", balance_days=10.0),
                LeaveBalance(user_id=hr.id, leave_type="earned", balance_days=18.0),
                LeaveBalance(user_id=hr.id, leave_type="casual", balance_days=8.0),
                LeaveBalance(user_id=hr.id, leave_type="sick", balance_days=10.0),
            ]
        )

        today = date.today()
        db.add(
            AttendanceRecord(user_id=uid, day=today, status="present"),
        )

        db.add_all(
            [
                Payslip(user_id=uid, month="2026-04", gross=95000, net=78000, pdf_url="#demo-april"),
                Payslip(user_id=uid, month="2026-05", gross=96000, net=79000, pdf_url="#demo-may"),
            ]
        )

        db.add_all(
            [
                LearningItem(
                    title="Secure Coding with FastAPI",
                    description="Hands-on API security patterns.",
                    department_tags="engineering,all",
                    skill_tags="fastapi,security,python",
                    duration_hours=4,
                    mandatory_for_roles="employee,manager",
                ),
                LearningItem(
                    title="Inclusive Leadership",
                    description="Practical habits for equitable teams.",
                    department_tags="all",
                    skill_tags="leadership,mentoring",
                    duration_hours=2,
                    mandatory_for_roles="manager,hr",
                ),
                LearningItem(
                    title="Accessibility in React Apps",
                    description="Semantic HTML, keyboard flows, ARIA.",
                    department_tags="engineering",
                    skill_tags="react,accessibility",
                    duration_hours=3,
                    mandatory_for_roles="employee",
                ),
                LearningItem(
                    title="Responsible AI for HR",
                    description="Guardrails for AI-assisted HR workflows.",
                    department_tags="hr,all",
                    skill_tags="ai,compliance,hr",
                    duration_hours=2.5,
                    mandatory_for_roles="hr,manager",
                ),
            ]
        )

        db.add_all(
            [
                Policy(
                    category="hr",
                    title="Attendance & Leave",
                    body="All leave requests must be submitted through the ESS portal. Attendance manipulation is prohibited.",
                    priority=5,
                    requires_ack=True,
                ),
                Policy(
                    category="ai",
                    title="Responsible AI Usage",
                    body="AI outputs must be reviewed by humans before decisions. No sensitive data in public AI tools.",
                    priority=6,
                    requires_ack=True,
                ),
                Policy(
                    category="it",
                    title="Device Security",
                    body="Lock devices when unattended. Use VPN for remote access. Report vulnerabilities immediately.",
                    priority=4,
                    requires_ack=True,
                ),
                Policy(
                    category="finance",
                    title="Expense Integrity",
                    body="Claims require valid receipts. False claims lead to disciplinary action.",
                    priority=3,
                    requires_ack=True,
                ),
            ]
        )

        db.add_all(
            [
                Announcement(
                    title="Welcome to WorkHub",
                    body="Your self-service portal for attendance, leave, payroll, learning, and compliance.",
                    audience_role="all",
                ),
                Announcement(
                    title="Manager office hours",
                    body="Weekly sync moved to Thursdays 4pm.",
                    audience_role="manager",
                ),
            ]
        )

        db.commit()
    finally:
        db.close()
