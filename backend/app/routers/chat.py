import re

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import LeaveBalance, User
from app.schemas import ChatMessageIn, ChatMessageOut

router = APIRouter(prefix="/api/chat", tags=["chat"])


def echo_reply(message: str, user: User, db: Session) -> tuple[str, list[str]]:
    text = message.strip().lower()
    suggestions: list[str] = []

    if re.search(r"\b(leave|pto|vacation)\b", text):
        bals = db.query(LeaveBalance).filter(LeaveBalance.user_id == user.id).all()
        if bals:
            parts = [f"{b.leave_type}: {b.balance_days} days" for b in bals]
            return (
                "Here is your leave snapshot — apply from the Leave tab in the portal. Balances: " + "; ".join(parts),
                ["How do I apply leave?", "Who approves my leave?"],
            )
        return (
            "You can apply for leave from Leave → Apply. If balances look empty, contact HR to initialize entitlements.",
            ["Show leave policy", "Open leave application"],
        )

    if "compliance" in text or "policy" in text:
        return (
            "Compliance policies are under Compliance. HR, Responsible AI, IT Security, and Financial Conduct sections are available — acknowledge after reading.",
            ["List HR policies", "Responsible AI rules"],
        )

    if "learning" in text or "course" in text or "training" in text:
        return (
            "Learning is under Learning — you will also see AI recommendations on the dashboard based on your skills and goals.",
            ["Recommend courses for me", "Mark a course complete"],
        )

    if "dashboard" in text or "module" in text:
        return (
            "Your dashboard has eight modules you can show or hide; preferences save automatically for next login.",
            ["Reset dashboard layout", "Explain attendance card"],
        )

    if "payroll" in text or "payslip" in text or "salary" in text:
        return (
            "Payroll shows payslips and summaries. Sensitive fields may be read-only depending on your region and configuration.",
            ["Download latest payslip", "Tax declaration help"],
        )

    if "hello" in text or "hi" in text:
        return (
            f"Hi {user.full_name.split()[0]}, I am Echo — your WorkHub assistant. Ask about leave, learning, compliance, or dashboard help.",
            ["What can you do?", "Leave balance"],
        )

    return (
        "I can help with leave guidance, compliance summaries, learning pointers, and dashboard tips. Try asking about your leave balance or policies.",
        ["Leave balance", "Compliance overview", "Learning tips"],
    )


@router.post("/echo", response_model=ChatMessageOut)
def echo_chat(payload: ChatMessageIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    reply, suggestions = echo_reply(payload.message, user, db)
    return ChatMessageOut(reply=reply, suggestions=suggestions)
