import hashlib
import logging
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from app.config import settings
from app.database import get_db
from app.mail import send_login_otp_email, smtp_configured
from app.models import LoginOtpChallenge, User, UserRole
from app.schemas import LoginOtpSend, LoginOtpSendResponse, LoginOtpVerify, Token, UserCreate, UserOut
from app.security import create_access_token, get_password_hash, verify_password
from app.leave_sync import ensure_user_leave_balances

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_OTP_ATTEMPTS = 8


def _norm_email(email: str) -> str:
    return email.strip().lower()


def _otp_hash(email: str, otp: str) -> str:
    raw = f"{settings.secret_key}|{_norm_email(email)}|{otp}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == str(payload.email)).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=str(payload.email),
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        role=UserRole(payload.role.value),
        department=payload.department,
        job_title=payload.job_title,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    ensure_user_leave_balances(db, user.id)
    db.commit()
    db.refresh(user)
    from app.routers.users import build_user_out

    return build_user_out(db, user)


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    token = create_access_token(subject=user.email)
    return Token(access_token=token)


@router.post("/login-otp/send", response_model=LoginOtpSendResponse)
async def send_login_otp(payload: LoginOtpSend, db: Session = Depends(get_db)):
    email_norm = _norm_email(str(payload.email))
    user = db.query(User).filter(func.lower(User.email) == email_norm).first()
    if not user:
        raise HTTPException(status_code=404, detail="No account found for this email")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    if not smtp_configured() and not settings.login_otp_log_to_console:
        raise HTTPException(
            status_code=503,
            detail="Email sign-in is not configured. Set SMTP_HOST and SMTP_FROM, or set LOGIN_OTP_LOG_TO_CONSOLE=true for development.",
        )

    db.query(LoginOtpChallenge).filter(LoginOtpChallenge.email == user.email).delete(synchronize_session=False)
    otp = f"{secrets.randbelow(900000) + 100000:d}"
    expires_at = datetime.utcnow() + timedelta(minutes=settings.login_otp_expire_minutes)
    row = LoginOtpChallenge(
        email=user.email,
        otp_hash=_otp_hash(user.email, otp),
        expires_at=expires_at,
        consumed=False,
        attempts=0,
    )
    db.add(row)
    db.commit()

    if smtp_configured():
        try:
            await run_in_threadpool(send_login_otp_email, user.email, otp)
        except Exception as e:  # noqa: BLE001
            logger.exception("SMTP send failed")
            db.query(LoginOtpChallenge).filter(LoginOtpChallenge.id == row.id).delete(synchronize_session=False)
            db.commit()
            raise HTTPException(status_code=502, detail=f"Could not send email: {e!s}") from e
    else:
        logger.warning("LOGIN_OTP_LOG_TO_CONSOLE: OTP for %s is %s (development only)", user.email, otp)

    delivery = "email" if smtp_configured() else "console"
    return LoginOtpSendResponse(
        message="A sign-in code was sent to your email address."
        if smtp_configured()
        else "Verification code issued.",
        expires_in_seconds=settings.login_otp_expire_minutes * 60,
        delivery=delivery,
    )


@router.post("/login-otp/verify", response_model=Token)
def verify_login_otp(payload: LoginOtpVerify, db: Session = Depends(get_db)):
    email_norm = _norm_email(str(payload.email))
    user = db.query(User).filter(func.lower(User.email) == email_norm).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or code")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    row = (
        db.query(LoginOtpChallenge)
        .filter(
            LoginOtpChallenge.email == user.email,
            LoginOtpChallenge.consumed.is_(False),
            LoginOtpChallenge.expires_at > datetime.utcnow(),
        )
        .order_by(LoginOtpChallenge.created_at.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=401, detail="Invalid or expired code. Request a new one.")

    if row.attempts >= MAX_OTP_ATTEMPTS:
        row.consumed = True
        db.add(row)
        db.commit()
        raise HTTPException(status_code=401, detail="Too many attempts. Request a new code.")

    if row.otp_hash != _otp_hash(user.email, payload.otp):
        row.attempts += 1
        db.add(row)
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid code")

    row.consumed = True
    db.add(row)
    db.commit()
    return Token(access_token=create_access_token(subject=user.email))
