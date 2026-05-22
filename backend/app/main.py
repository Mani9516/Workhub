from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    admin,
    ai,
    announcements,
    attendance,
    auth,
    career,
    certifications,
    chat,
    compliance,
    dashboard,
    health,
    learning,
    leave,
    meta,
    payroll,
    users,
    wellness,
    wfh,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    import os

    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)

    from sqlalchemy import inspect, text

    insp = inspect(engine)
    if insp.has_table("certification_entries"):
        cols = {c["name"] for c in insp.get_columns("certification_entries")}
        if "typical_duration_weeks" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE certification_entries ADD COLUMN typical_duration_weeks INTEGER"))
        if "self_progress_pct" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE certification_entries ADD COLUMN self_progress_pct INTEGER DEFAULT 0 NOT NULL"))

    if insp.has_table("user_learning_progress"):
        ul_cols = {c["name"] for c in insp.get_columns("user_learning_progress")}
        if "progress_pct" not in ul_cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE user_learning_progress ADD COLUMN progress_pct INTEGER DEFAULT 0 NOT NULL"))
            with engine.begin() as conn:
                conn.execute(text("UPDATE user_learning_progress SET progress_pct = 100 WHERE completed = 1"))

    from app.config import settings
    from app.database import SessionLocal
    from app.models import CertificationEntry

    if settings.clear_certifications_on_start:
        db = SessionLocal()
        try:
            db.query(CertificationEntry).delete()
            db.commit()
        finally:
            db.close()

    from app.seed import seed_if_empty

    seed_if_empty()
    from app.leave_sync import sync_all_users_leave_balances

    db = SessionLocal()
    try:
        sync_all_users_leave_balances(db)
        db.commit()
    finally:
        db.close()
    yield


app = FastAPI(title="WorkHub API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://frontend:80",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(meta.router)
app.include_router(certifications.router)
app.include_router(leave.router)
app.include_router(wfh.router)
app.include_router(dashboard.router)
app.include_router(learning.router)
app.include_router(compliance.router)
app.include_router(ai.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(attendance.router)
app.include_router(payroll.router)
app.include_router(announcements.router)
app.include_router(career.router)
app.include_router(wellness.router)


@app.get("/")
def root():
    return {
        "service": "WorkHub API",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "health": "/api/health/",
    }
