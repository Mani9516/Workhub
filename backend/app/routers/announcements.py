from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Announcement, User
from app.schemas import AnnouncementOut

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("/", response_model=list[AnnouncementOut])
def list_announcements(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    return (
        db.query(Announcement)
        .filter((Announcement.audience_role == "all") | (Announcement.audience_role == current.role.value))
        .order_by(Announcement.created_at.desc())
        .all()
    )
