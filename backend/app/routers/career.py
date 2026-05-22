from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.career_paths import recommend_career_paths
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User
from app.routers.certifications import approved_certifications_blob, approved_titles_for_user
from app.schemas import SkillInsightsOut
from app.skill_insights import build_skill_insights

router = APIRouter(prefix="/api/career", tags=["career"])


@router.get("/skill-insights", response_model=SkillInsightsOut)
def career_skill_insights(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    """Suggested certifications and open role tracks from skills, interests, goals, and HR-approved certs."""
    approved = approved_titles_for_user(db, current.id)
    sc, sr = build_skill_insights(current, approved)
    return SkillInsightsOut(suggested_certifications=sc, open_roles=sr)


@router.get("/summary")
def career_summary_auth(db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    blob = approved_certifications_blob(db, current.id)
    recs = recommend_career_paths(current, hr_verified_cert_blob=blob)
    return {
        "user": current.full_name,
        "certifications": "",
        "verified_certification_titles": approved_titles_for_user(db, current.id),
        "tip": "Only HR-approved certifications are shown and used for ranking, together with your skills, goals, and role. Submit new items from Profile for HR review.",
        "recommendations": recs,
    }
