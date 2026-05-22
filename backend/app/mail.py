"""SMTP email delivery for login OTP (configure via environment)."""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings

logger = logging.getLogger(__name__)


def smtp_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from)


def send_login_otp_email(to_email: str, otp: str) -> None:
    if not smtp_configured():
        raise RuntimeError("SMTP is not configured (SMTP_HOST / SMTP_FROM required)")

    msg = EmailMessage()
    msg["Subject"] = "Your WorkHub sign-in code"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.set_content(
        f"Your WorkHub one-time sign-in code is: {otp}\n\n"
        f"This code expires in {settings.login_otp_expire_minutes} minutes.\n"
        "If you did not request this, you can ignore this email.\n"
    )

    context = ssl.create_default_context()
    if settings.smtp_use_tls:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=30) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
    else:
        with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=30) as server:
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)

    logger.info("Login OTP email sent to %s", to_email)
