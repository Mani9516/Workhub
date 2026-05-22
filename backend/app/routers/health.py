from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import Base, get_db
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/health", tags=["health"])


@router.get("/")
def health():
    return {"status": "ok", "service": "workhub"}


@router.get("/db")
def db_ping(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"database": "reachable"}


@router.get("/metrics")
def metrics(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    """Lightweight counts for dashboards / demos."""
    tables = Base.metadata.tables.keys()
    counts = {}
    for name in tables:
        try:
            counts[name] = db.execute(text(f"SELECT COUNT(*) FROM {name}")).scalar()
        except Exception:
            counts[name] = None
    return {"table_row_counts": counts, "registered_routes": 25}
